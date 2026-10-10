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

/** Gabarit commun : meme habillage que les autres courriels du projet. */
function mail_template(string $title, string $intro, string $highlight, string $footer): string
{
    return "<html><body style='background:#0a0a1a;font-family:system-ui,sans-serif;padding:40px'>" .
        "<div style='max-width:520px;margin:auto;background:#0f0f2a;border:1px solid rgba(139,92,246,0.2);border-radius:16px;padding:32px'>" .
        "<h1 style='color:#fff'>🏴 CTF Arena</h1>" .
        "<p style='color:rgba(196,181,253,0.9)'>$title</p>" .
        "<p style='color:rgba(196,181,253,0.7)'>$intro</p>" .
        $highlight .
        "<p style='color:rgba(196,181,253,0.5);font-size:12px'>$footer</p>" .
        '</div></body></html>';
}
