# Mes Actions — PWA Shell (GitHub Pages)

**Version stable : 1.0.2**

Cette repository contient le **shell PWA** (hébergé sur GitHub Pages) pour accéder rapidement à la WebApp **Google Apps Script** “Mes Actions”.

La PWA sert uniquement de **launcher installable** (icône + démarrage app-like).  
Toute la logique métier reste hébergée sur `script.google.com`.

---

## URL
- **PWA (GitHub Pages)**  
  https://jordanlilloux-gif.github.io/mes-actions-pwa/

---

## Fonctionnement

- **Non installée (ouverte dans Chrome)**  
  La page reste sur GitHub Pages afin de préserver l’installabilité PWA.

- **Installée (mode standalone)**  
  L’app affiche brièvement “Ouverture de Mes Actions…” puis redirige automatiquement vers la WebApp Google Apps Script.

- **Hors ligne (mode avion)**  
  L’app reste dans le shell PWA et affiche `offline.html`.  
  La WebApp Google Apps Script nécessite une connexion Internet.

---

## Règles importantes (à ne pas casser)

1. **Ne jamais rediriger automatiquement vers Apps Script hors du mode standalone**  
   Sinon Chrome peut considérer que l’application n’est plus une PWA correctement installable.

2. **À chaque modification des fichiers PWA, incrémenter `SW_VERSION` dans `sw.js`**  
   Sans cela, certains appareils conserveront l’ancienne version via le cache Service Worker.

---

## Déploiement (GitHub Pages)

- Le shell PWA est servi via GitHub Pages.
- Après un commit/push, la mise à jour peut être conservée par le cache PWA côté appareil.

---

## Mise à jour / Refresh côté Android (important)

Les PWAs installées disposent de leur propre cache.

Pour garantir qu’une nouvelle version est bien prise en compte :
1. **Désinstaller** l’application “Mes Actions”
2. Ouvrir l’URL GitHub Pages
3. **Réinstaller** l’application

---

## Mode debug

URL de diagnostic (désactive la redirection automatique) :
- https://jordanlilloux-gif.github.io/mes-actions-pwa/?pwa_dbg=1

Ce mode permet de vérifier :
- si l’app est en standalone
- si le Service Worker est actif
- la destination de redirection

---

## Fichiers clés

- `index.html` — page principale (installation, logique standalone, redirection)
- `manifest.json` — configuration PWA (start_url, scope, icônes)
- `sw.js` — Service Worker et cache du shell
- `offline.html` — page affichée hors ligne

---

## Historique des versions

- **1.0.2** — Version stable  
  - Redirection automatique fiable en standalone  
  - Expérience app-like améliorée  
  - Gestion propre du mode hors ligne
