<?php
/**
 * mailer.php — envoi de courriel par SMTP authentifie.
 *
 * La fonction mail() de PHP suppose un agent local ; l'image php:8.2-apache
 * n'en a aucun, donc tout envoi echouait en silence. On parle donc SMTP
 * directement au fournisseur (Brevo, Mailjet, Gmail...), sans dependance
 * externe : un socket, STARTTLS, AUTH LOGIN.
 *
 * Toute panne est journalisee et remonte en false — jamais d'exception vers
 * l'appelant, un courriel perdu ne doit pas casser une inscription.
 */

declare(strict_types=1);

const SMTP_TIMEOUT = 15;

function smtp_log(string $message): void
{
    $line = date('Y-m-d H:i:s') . ' [mail] ' . $message . PHP_EOL;
    @file_put_contents('/var/log/ctf_arena/misc.log', $line, FILE_APPEND);
}

/** Lit une reponse serveur, gere les reponses multi-lignes (250-...). */
function smtp_read($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (strlen($line) < 4 || $line[3] !== '-') {
            break;
        }
    }
    return $data;
}

/** Envoie une commande et verifie le code attendu. */
function smtp_cmd($socket, string $command, string $expected, string $label): bool
{
    if ($command !== '') {
        fwrite($socket, $command . "\r\n");
    }
    $response = smtp_read($socket);
    if (strncmp($response, $expected, strlen($expected)) !== 0) {
        // Jamais le mot de passe dans les journaux : on ne logue que l'etape.
        smtp_log("echec a l'etape $label : " . trim(substr($response, 0, 120)));
        return false;
    }
    return true;
}

/**
 * Envoie un courriel HTML. Retourne false si la configuration est absente ou
 * si le serveur refuse — l'appelant decide quoi en faire.
 */
function send_mail_smtp(string $toEmail, string $toName, string $subject, string $htmlBody): bool
{
    if (SMTP_USER === '' || SMTP_PASSWORD === '') {
        smtp_log('envoi ignore : SMTP_USER ou SMTP_PASSWORD absent');
        return false;
    }

    $host = SMTP_HOST;
    $port = SMTP_PORT;
    // 465 = TLS implicite, 587 = STARTTLS (le cas courant chez Brevo/Mailjet).
    // SMTP_SECURE=none n'existe que pour un serveur de test local : aucun
    // fournisseur public n'accepte une authentification en clair.
    $implicitTls = $port === 465 || SMTP_SECURE === 'ssl';
    $useStartTls = !$implicitTls && SMTP_SECURE !== 'none';
    $endpoint = ($implicitTls ? 'ssl://' : 'tcp://') . $host . ':' . $port;

    $context = stream_context_create([
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true],
    ]);
    $socket = @stream_socket_client(
        $endpoint,
        $errno,
        $errstr,
        SMTP_TIMEOUT,
        STREAM_CLIENT_CONNECT,
        $context
    );
    if (!$socket) {
        smtp_log("connexion impossible a $endpoint : $errstr ($errno)");
        return false;
    }
    stream_set_timeout($socket, SMTP_TIMEOUT);

    $ok = smtp_cmd($socket, '', '220', 'banniere');
    $helo = 'EHLO ' . (parse_url(FRONTEND_URL, PHP_URL_HOST) ?: 'ctf-arena.local');
    $ok = $ok && smtp_cmd($socket, $helo, '250', 'EHLO');

    if ($ok && $useStartTls) {
        $ok = smtp_cmd($socket, 'STARTTLS', '220', 'STARTTLS');
        if ($ok) {
            $ok = @stream_socket_enable_crypto(
                $socket,
                true,
                STREAM_CRYPTO_METHOD_TLS_CLIENT
            );
            if (!$ok) {
                smtp_log('negociation TLS refusee');
            }
        }
        // Apres STARTTLS, le dialogue repart d'un EHLO.
        $ok = $ok && smtp_cmd($socket, $helo, '250', 'EHLO apres TLS');
    }

    $ok = $ok && smtp_cmd($socket, 'AUTH LOGIN', '334', 'AUTH LOGIN');
    $ok = $ok && smtp_cmd($socket, base64_encode(SMTP_USER), '334', 'identifiant');
    $ok = $ok && smtp_cmd($socket, base64_encode(SMTP_PASSWORD), '235', 'authentification');

    $ok = $ok && smtp_cmd($socket, 'MAIL FROM:<' . SMTP_FROM . '>', '250', 'MAIL FROM');
    $ok = $ok && smtp_cmd($socket, 'RCPT TO:<' . $toEmail . '>', '250', 'RCPT TO');
    $ok = $ok && smtp_cmd($socket, 'DATA', '354', 'DATA');

    if ($ok) {
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedToName = '=?UTF-8?B?' . base64_encode($toName) . '?=';
        $encodedFromName = '=?UTF-8?B?' . base64_encode(SMTP_FROM_NAME) . '?=';
        $headers = [
            'Date: ' . date('r'),
            'From: ' . $encodedFromName . ' <' . SMTP_FROM . '>',
            'To: ' . $encodedToName . ' <' . $toEmail . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        // Un point seul en debut de ligne termine le message : on le double.
        $body = chunk_split(base64_encode($htmlBody));
        $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;
        $message = str_replace("\r\n.", "\r\n..", $message);
        fwrite($socket, $message . "\r\n.\r\n");
        $ok = smtp_cmd($socket, '', '250', 'envoi du corps');
    }

    @fwrite($socket, "QUIT\r\n");
    @fclose($socket);
    return $ok;
}

/**
 * Gabarit commun des courriels, aux couleurs du CTF.
 *
 * Ecrit en tableaux et en styles en ligne : les clients de messagerie ignorent
 * les feuilles de style et la mise en page moderne. Aucune image non plus —
 * Gmail les bloque par defaut, la banniere est donc dessinee en HTML.
 */
function mail_template(string $title, string $intro, string $highlight, string $footer): string
{
    $preheader = strip_tags($intro);
    return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CTF Arena</title>
</head>
<body style="margin:0;padding:0;background:#0a0a1a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">$preheader</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#0a0a1a;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
               style="width:560px;max-width:100%;background:#0f0f2a;border:1px solid #2a2150;border-radius:18px;overflow:hidden;">

          <!-- Banniere -->
          <tr>
            <td style="background:#8b5cf6;background-image:linear-gradient(135deg,#a78bfa 0%,#8b5cf6 55%,#6d28d9 100%);padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:30px;line-height:34px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">
                    &#127988; CTF Arena
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:6px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:600;color:#ede9fe;letter-spacing:3px;text-transform:uppercase;">
                    Capture the Flag
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Liseré -->
          <tr><td style="height:3px;background:#1a1440;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Corps -->
          <tr>
            <td style="padding:32px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 14px;font-size:18px;line-height:26px;font-weight:600;color:#ffffff;">$title</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#c4b5fd;">$intro</p>
              $highlight
              <p style="margin:24px 0 0;font-size:12px;line-height:19px;color:#8b7fb8;">$footer</p>
            </td>
          </tr>

          <!-- Pied -->
          <tr>
            <td style="padding:18px 32px;background:#0b0920;border-top:1px solid #2a2150;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:17px;color:#6d6494;">
              Message automatique de CTF Arena. Inutile d'y repondre.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

/** Bloc de code a six chiffres, mis en avant au centre du courriel. */
function mail_code_block(string $code): string
{
    $spaced = implode('&#8202;', str_split($code));
    return <<<HTML
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="background:#1a1440;border:1px solid #4c1d95;border-radius:14px;padding:22px 16px;">
      <div style="font-family:Consolas,Menlo,Courier New,monospace;font-size:38px;line-height:44px;font-weight:700;color:#ffffff;letter-spacing:12px;text-indent:12px;">$spaced</div>
      <div style="padding-top:8px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a78bfa;">Votre code</div>
    </td>
  </tr>
</table>
HTML;
}

/** Bouton d'action, rendu en tableau pour survivre aux clients de messagerie. */
function mail_button(string $url, string $label): string
{
    return <<<HTML
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="background:#8b5cf6;border-radius:12px;">
      <a href="$url" style="display:inline-block;padding:14px 32px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">$label</a>
    </td>
  </tr>
</table>
HTML;
}
