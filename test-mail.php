<?php
/**
 * test-mail.php — verifie la configuration SMTP en envoyant un courriel reel.
 *
 *   docker compose exec backend php /usr/local/bin/ctf-test-mail.php vous@exemple.fr
 *
 * Le script reutilise exactement le chemin d'envoi de l'application : si ce
 * message arrive, les codes de confirmation arriveront aussi.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$destination = $argv[1] ?? '';
if ($destination === '' || !filter_var($destination, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage : php test-mail.php <adresse@destination>\n");
    exit(1);
}

// api.php definit les constantes SMTP et inclut mailer.php, mais il traite
// aussi une requete HTTP : on recopie ici le strict necessaire.
foreach (['SMTP_HOST' => 'smtp.gmail.com', 'SMTP_FROM' => 'noreply@ctf-arena.local'] as $name => $default) {
    define($name, getenv($name) ?: $default);
}
define('SMTP_PORT', (int) (getenv('SMTP_PORT') ?: 587));
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASSWORD', getenv('SMTP_PASSWORD') ?: '');
define('SMTP_FROM_NAME', 'CTF Arena');
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'http://localhost:3000');
$secure = strtolower((string) (getenv('SMTP_SECURE') ?: 'tls'));
define('SMTP_SECURE', in_array($secure, ['tls', 'ssl', 'none'], true) ? $secure : 'tls');

require_once '/var/www/html/mailer.php';

echo "Serveur   : " . SMTP_HOST . ':' . SMTP_PORT . ' (' . SMTP_SECURE . ")\n";
echo "Expediteur: " . SMTP_FROM . "\n";
echo "Identifiant: " . (SMTP_USER !== '' ? SMTP_USER : '(absent)') . "\n";
echo "Mot de passe: " . (SMTP_PASSWORD !== '' ? 'defini' : '(absent)') . "\n\n";

if (SMTP_USER === '' || SMTP_PASSWORD === '') {
    fwrite(STDERR, "SMTP_USER ou SMTP_PASSWORD manque dans le .env : aucun envoi possible.\n");
    exit(1);
}

$body = mail_template(
    'Test de configuration',
    "Si vous lisez ce message, l'envoi de courriel fonctionne : les codes de confirmation arriveront de la meme facon.",
    mail_code_block('123456'),
    'Message envoye par ctf-test-mail.php. Le code ci-dessus est un exemple, il ne sert a rien.'
);

$ok = send_mail_smtp($destination, 'Organisateur', 'Test CTF Arena', $body);
if ($ok) {
    echo "Envoi accepte par le serveur. Verifiez la boite de reception et les spams.\n";
    exit(0);
}
fwrite(STDERR, "Echec. Detail dans /var/log/ctf_arena/misc.log :\n");
fwrite(STDERR, "  docker compose exec backend tail -5 /var/log/ctf_arena/misc.log\n");
exit(1);
