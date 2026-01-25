# Mes Actions — PWA Shell

PWA (Progressive Web App) hébergée sur **GitHub Pages** servant de **shell d’accès** à la Web App Google Apps Script **Mes Actions**.

👉 Ce dépôt contient **uniquement** le frontend PWA (UI, offline, installation).  
👉 L’authentification et la logique métier sont gérées côté **Apps Script**.

---

## 🌐 Accès

- **PWA (GitHub Pages)**  
  https://jordanlilloux-gif.github.io/mes-actions-pwa/

---

## 🚀 Fonctionnement

### 🧭 Navigateur (desktop / mobile)
- Page d’accueil avec bouton **Ouvrir Mes actions**
- Mode hors-ligne accessible
- Instructions d’installation selon la plateforme

### 📱 Application installée (standalone)
- Ouverture directe de l’app
- **Redirection automatique vers la page de connexion**
- UI minimaliste (aucun bouton)
- Hors connexion → affichage automatique de `offline.html`

---

## 📲 Installation

### 🍎 iPhone / iPad (Safari iOS)
1. Ouvrir le site dans **Safari**
2. Appuyer sur **Partager** (⬆️)
3. Choisir **Sur l’écran d’accueil / Ajouter à l’écran d’accueil**
4. Laisser activé **Ouvrir comme app web**
5. Appuyer sur **Ajouter**

### 🤖 Android (Chrome)
- Si le bouton **Installer** apparaît → l’utiliser
- Sinon : menu ⋮ → **Installer l’application**

---

## 📴 Mode hors-ligne

- Le **shell PWA** reste accessible hors connexion
- Toute navigation impossible affiche `offline.html`
- Aucune page blanche possible

---

## 🧠 Architecture

- **PWA shell (GitHub Pages)**  
  UI, installation, offline, redirection
- **Web App (Google Apps Script)**  
  Authentification (`mode=entry`) et logique métier

### Règles clés
- Aucune logique d’authentification côté PWA
- Source canonique : `/exec`
- Séparation stricte des responsabilités

---

## 🧰 Technique

- Service Worker versionné (`SW_VERSION`)
- Cache d’assets essentiels
- Navigation *network-first* avec fallback offline
- Mise à jour immédiate (`skipWaiting` + `clients.claim`)

---

## 🧪 Debug

Ajouter `?pwa_dbg=1` à l’URL pour :
- désactiver la redirection automatique
- afficher les informations de diagnostic

Exemple :  
https://jordanlilloux-gif.github.io/mes-actions-pwa/?pwa_dbg=1

---

## 📦 Déploiement

1. Modifier les fichiers
2. **Incrémenter `SW_VERSION`** dans `sw.js`
3. Commit / push
4. GitHub Pages publie automatiquement

---

## 🏷️ Version

- **Version stable : 1.0.4**
- Dernière mise à jour : Standalone minimal + offline bulletproof

---

## 📄 Licence

Usage interne / privé.
