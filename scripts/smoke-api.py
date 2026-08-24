"""Parcours de bout en bout de l'API CTF Arena.

Crée un jeu de données de test (catégories, challenges, joueurs, équipe),
rejoue le parcours complet et vérifie chaque réponse. À lancer contre une
instance jetable, jamais contre l'instance de l'événement : le script écrit
en base et modifie l'état du CTF.

    python scripts/smoke-api.py <mot_de_passe_admin> <tag> [url_de_base]

Le tag suffixe tous les identifiants créés, ce qui permet de relancer le
script sans collision. L'URL par défaut est http://localhost:3100/api.php.
"""
import json
import sys
import urllib.request
import urllib.error
import http.cookiejar

BASE = (sys.argv[3] if len(sys.argv) > 3
        else "http://localhost:3100/api.php") + "?action="
results = []


class Session:
    def __init__(self, name):
        self.name = name
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )
        self.csrf = None

    def call(self, action, payload=None, expect_ok=True, note="", query="",
             ok_key="ok"):
        url = BASE + action + query
        headers = {"Content-Type": "application/json"}
        data = json.dumps(payload).encode() if payload is not None else None
        if self.csrf:
            headers["X-CSRF-Token"] = self.csrf
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with self.opener.open(req, timeout=30) as r:
                status, raw = r.status, r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            results.append((action, self.name, "EXC", str(e)[:120], note, False))
            return {}
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            results.append((action, self.name, status, raw[:120], note, False))
            return {}
        ok = bool(body.get("ok")) if ok_key == "ok" else (ok_key in body)
        passed = ok if expect_ok else (not ok)
        results.append((action, self.name, status,
                        "" if passed else json.dumps(body)[:150], note, passed))
        if body.get("csrf"):
            self.csrf = body["csrf"]
        elif body.get("token"):
            self.csrf = body["token"]
        return body


def main(admin_pw, tag):
    admin, p1, p2, p3 = (Session(n) for n in ("admin", "joueur1", "joueur2", "joueur3"))
    T = tag.upper()

    admin.call("csrf")
    admin.call("get_ctf_state")

    # ── Comptes ───────────────────────────────────────────────────────────
    ids = {}
    for s, base in ((p1, "alpha"), (p2, "bravo"), (p3, "charlie")):
        n = base + tag
        body = s.call("register", {
            "username": n, "email": f"{n}@audit.local",
            "password": "MotDePasse123!", "age": 22,
            "gender": "other", "playMode": "solo",
        })
        ids[base] = (body.get("user") or {}).get("id")
        s.call("me")

    admin.call("login", {"identifier": "ALPHATEN", "password": admin_pw})
    admin.call("me")
    # Le mode de jeu se fige une fois la partie lancée : on repart à l'arrêt.
    admin.call("set_ctf_state", {"key": "game_started", "value": "0"})

    # ── Catégories ────────────────────────────────────────────────────────
    admin.call("add_category", {"id": "WEB" + T, "name": "Web",
                                "description": "epreuves web", "icon": "🌐",
                                "color": "#3B82F6"})
    admin.call("add_category", {"id": "CRY" + T, "name": "Crypto",
                                "description": "epreuves crypto", "icon": "🔐",
                                "color": "#8B5CF6"})
    admin.call("update_category", {"id": "CRY" + T, "name": "Cryptographie",
                                   "description": "maj", "icon": "🔐",
                                   "color": "#8B5CF6"})
    admin.call("reorder_categories", {"order": ["CRY" + T, "WEB" + T]})
    admin.call("get_categories")

    # ── Challenges ────────────────────────────────────────────────────────
    c1 = admin.call("add_challenge", {
        "title": "Injection facile", "category": "WEB" + T, "points": 100,
        "description": "trouve le flag", "flag": "CTF{web1}"}).get("id")
    c2 = admin.call("add_challenge", {
        "title": "Cesar", "category": "CRY" + T, "points": 250,
        "description": "decale les lettres", "flag": "CTF{crypto1}",
        "difficultyMode": "hard", "difficulty": "hard"}).get("id")
    admin.call("add_challenge", {
        "title": "Avec fichier", "category": "WEB" + T, "points": 150,
        "description": "telecharge la piece jointe", "flag": "CTF{file1}",
        "files": [{"name": "indice.txt",
                   "data": "data:text/plain;base64,aW5kaWNlCg=="}]})
    admin.call("update_challenge", {
        "id": c2, "title": "Cesar revisite", "category": "CRY" + T,
        "points": 300, "description": "decale", "flag": "CTF{crypto1}"})
    chals = admin.call("get_challenges").get("challenges", [])
    with_file = next((c for c in chals if c.get("files")), None)
    if with_file:
        fid = with_file["files"][0]["id"]
        admin.call("download_file", query=f"&id={fid}", ok_key="__binaire__",
                   expect_ok=False, note="téléchargement : contenu brut, pas du JSON")

    # ── Amis (avant démarrage) ────────────────────────────────────────────
    p1.call("search_users", query="&q=bravo" + tag)
    p1.call("send_friend_request", {"toUserId": ids["bravo"]})
    recv = p2.call("get_pending_received").get("requests", [])
    p1.call("get_pending_sent")
    if recv:
        p2.call("accept_friend_request", {"requestId": recv[0]["id"]})
    p1.call("get_friends")
    p1.call("remove_friend", {"friendId": ids["bravo"]})
    p1.call("send_friend_request", {"toUserId": ids["bravo"]},
            note="ré-invitation après suppression")
    recv2 = p2.call("get_pending_received").get("requests", [])
    if recv2:
        p2.call("reject_friend_request", {"requestId": recv2[0]["id"]})
    p1.call("send_friend_request", {"toUserId": ids["bravo"]},
            note="ré-invitation après refus")
    sent = p1.call("get_pending_sent").get("requests", [])
    if sent:
        p1.call("cancel_friend_request", {"requestId": sent[0]["id"]})

    # ── Équipes (avant démarrage : le mode de jeu se fige ensuite) ────────
    for s in (p1, p2, p3):
        s.call("update_play_mode", {"playMode": "multiplayer"})
    t = p1.call("create_team", {"name": "Auditeurs " + tag,
                                "description": "equipe de test",
                                "emoji": "🛠️", "isPublic": True}).get("teamId")
    p1.call("get_user_team")
    p1.call("get_teams")
    p1.call("search_teams", query="&q=Auditeurs")
    p2.call("join_team", {"teamId": t})
    p3.call("join_team", {"teamId": t})
    p1.call("get_team_members", query=f"&teamId={t}")
    p1.call("promote_member", {"teamId": t, "targetId": ids["bravo"]})
    p1.call("demote_member", {"teamId": t, "targetId": ids["bravo"]})
    p1.call("update_team", {"teamId": t, "name": "Auditeurs v2 " + tag,
                            "description": "maj", "emoji": "🛠️",
                            "isPublic": False})
    p1.call("kick_member", {"teamId": t, "targetId": ids["charlie"]})
    p1.call("ban_member", {"teamId": t, "targetId": ids["bravo"]})
    admin.call("add_team_member_admin", {"teamId": t, "userId": ids["charlie"]})
    p3.call("leave_team")
    p1.call("delete_team", {"teamId": t})
    # Retour en solo : sans équipe, le mode multijoueur refuse les soumissions.
    for s in (p1, p2, p3):
        s.call("update_play_mode", {"playMode": "solo"})

    # ── Démarrage du CTF ──────────────────────────────────────────────────
    admin.call("set_ctf_state", {"key": "game_started", "value": "1"})
    admin.call("set_ctf_state", {"key": "event_theme", "value": "halloween"})

    # ── Flags ─────────────────────────────────────────────────────────────
    p1.call("submit_flag", {"challengeId": c1, "flag": "CTF{faux}",
                            "solveTimeMs": 5000},
            note="flag faux : ok:true correct:false")
    p1.call("submit_flag", {"challengeId": c1, "flag": "CTF{web1}",
                            "solveTimeMs": 9000})
    p1.call("submit_flag", {"challengeId": c1, "flag": "CTF{web1}"},
            expect_ok=False, note="rejeu refusé")
    p1.call("submit_flag", {"challengeId": c2, "flag": "CTF{crypto1}",
                            "solveTimeMs": 30000})
    p2.call("submit_flag", {"challengeId": c1, "flag": "CTF{web1}",
                            "solveTimeMs": 15000})
    admin.call("submit_flag", {"challengeId": c1, "flag": "CTF{web1}"},
               expect_ok=False, note="admin ne soumet pas")

    p1.call("get_user_flags")
    admin.call("get_all_flags")
    p1.call("get_ranking")
    p1.call("get_team_ranking")
    admin.call("get_podium")

    # ── Achievements ──────────────────────────────────────────────────────
    aid = "first-blood-" + tag
    admin.call("add_achievement", {
        "id": aid, "title": "Premier sang", "description": "resoudre une epreuve",
        "icon": "🩸", "condition": "flags_count", "conditionValue": 1})
    admin.call("update_achievement", {
        "id": aid, "title": "Premier sang", "description": "maj", "icon": "🩸",
        "condition": "flags_count", "conditionValue": 1})
    admin.call("get_achievements")
    p1.call("evaluate_achievements")
    p1.call("get_user_achievements")
    admin.call("get_all_user_achievements")
    admin.call("unlock_achievement", {"userId": ids["alpha"], "achievementId": aid})
    admin.call("revoke_achievement", {"userId": ids["alpha"], "achievementId": aid})

    # ── Administration des joueurs ────────────────────────────────────────
    players = admin.call("get_players").get("players", [])
    pid = next((p["id"] for p in players
                if p.get("username") == "charlie" + tag), ids["charlie"])
    admin.call("add_bonus", {"userId": pid, "points": 50, "reason": "aide"})
    admin.call("add_malus", {"userId": pid, "points": 20, "reason": "triche"})
    admin.call("set_challenge_solved", {"userId": pid, "challengeId": c1,
                                        "solved": True})
    admin.call("reset_user_progress", {"userId": pid})

    # ── Profil public ─────────────────────────────────────────────────────
    p1.call("update_profile", {"avatarEmoji": "🐙", "bio": "auditeur"})
    p1.call("get_public_profile", query="&username=alpha" + tag)

    # ── Événements ────────────────────────────────────────────────────────
    admin.call("trigger_event", {})
    p1.call("get_active_event")
    admin.call("cancel_event")
    myst = admin.call("trigger_mystery", {})
    p2.call("submit_mystery_flag", {"flag": "CTF{improbable}"},
            note="mauvais flag mystere : ok:true correct:false")
    if myst.get("ok"):
        admin.call("cancel_event")

    # ── Mot de passe oublié ───────────────────────────────────────────────
    p1.call("forgot_password", {"email": f"alpha{tag}@audit.local"})
    p1.call("validate_reset_token", {"token": "invalide"},
            expect_ok=False, note="token invalide refusé")

    # ── Journal, export, import ───────────────────────────────────────────
    admin.call("get_activity_logs")
    export = admin.call("export_data", ok_key="version")
    if export.get("version"):
        admin.call("import_data", export)

    # ── Endpoint retiré, fins de session ──────────────────────────────────
    admin.call("ctf_state_stream", expect_ok=False, note="SSE retiré : 410")
    admin.call("delete_user", {"userId": ids["charlie"]})
    for s in (p1, p2, p3, admin):
        s.call("logout")

    failures = [r for r in results if not r[5]]
    print(f"{len(results)} appels, {len(failures)} en echec\n")
    if failures:
        print("ECHECS")
        for action, who, status, detail, note, _ in failures:
            print(f"  {action:26} [{who:8}] {status}  {detail} {note}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
