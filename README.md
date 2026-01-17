# Mes Actions — PWA Shell (GitHub Pages)

**Version stable : 1.0.3**

Shell PWA (GitHub Pages) servant de lanceur installable vers la WebApp Google Apps Script “Mes Actions”.
La PWA gère l’installation, le démarrage “app-like” et un écran hors-ligne.  
Toute la logique métier reste hébergée sur `script.google.com`.

## URL
https://jordanlilloux-gif.github.io/mes-actions-pwa/

## Fonctionnement

- **Non installée (Chrome / Safari)**  
  La page reste sur GitHub Pages afin de préserver l’installabilité PWA.

- **Installée (mode standalone)**  
  L’app affiche brièvement “Ouverture de Mes Actions…” puis redirige automatiquement vers la WebApp Google Apps Script.

- **Hors ligne (mode avion)**  
  L’app reste dans le shell PWA et affiche `offline.html`.  
  La WebApp Google Apps Script nécessite une connexion Internet.

## Spécificités iPhone / iPad

- L’installation **doit se faire depuis Safari** (Chrome iOS ne permet pas l’installation).
- Procédure :
  - Safari → Partager → Ajouter à l’écran d’accueil
  - Laisser **“Ouvrir comme app web”** activé
- Une aide visuelle est affichée automatiquement sur iOS avant installation.

## Règles importantes (à ne pas casser)

1) **Ne jamais rediriger automatiquement vers Apps Script hors du mode standalone**  
   (sinon Chrome / Safari peut dégrader l’installabilité).

2) **À chaque modification des fichiers PWA, incrémenter `SW_VERSION` dans `sw.js`**  
   Sans cela, certains appareils conserveront l’ancienne version via le cache Service Worker.

## Mise à jour / Refresh côté Android (important)

Les PWAs installées disposent de leur propre cache.

Pour garantir qu’une nouvelle version est bien prise en compte :
1. Désinstaller l’application “Mes Actions”
2. Ouvrir l’URL GitHub Pages
3. Réinstaller l’application

## Mode debug

URL de diagnostic (désactive la redirection automatique) :
https://jordanlilloux-gif.github.io/mes-actions-pwa/?pwa_dbg=1

## Fichiers clés

- `index.html` — page principale (installation, standalone, redirection)
- `manifest.json` — configuration PWA
- `sw.js` — Service Worker et cache du shell
- `offline.html` — page affichée hors ligne

## Historique des versions

- **1.0.3**
  - Message d’aide spécifique iOS avant installation
  - Expérience d’installation clarifiée sur iPhone / iPad

- **1.0.2**
  - Redirection automatique fiable en mode standalone
  - Gestion propre du mode hors ligne
