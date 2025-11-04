# TP Serverless – Azure (YNOV M1)

## 📋 Description
Ce projet déploie une **application web 100% serverless** sur Microsoft Azure composée de :
- Une **API REST Flask** conteneurisée et déployée sur **Azure Container Apps**
- Une **passerelle publique** via **Azure API Management (APIM)**
- Un **site web statique** hébergé sur **Azure Storage Static Website**
- Configuration **CORS** pour permettre les appels cross-origin sécurisés

---

## 📑 Table des matières
1. [Architecture & Objectifs](#architecture--objectifs)
2. [Prérequis](#prérequis)
3. [Structure du Projet](#structure-du-projet)
4. [Déploiement Étape par Étape](#déploiement-étape-par-étape)
   - [Étape 1 : Déploiement de l'API Flask (Container Apps)](#étape-1--déploiement-de-lapi-flask-container-apps)
   - [Étape 2 : Configuration Azure API Management](#étape-2--configuration-azure-api-management)
   - [Étape 3 : Hébergement du Site Statique](#étape-3--hébergement-du-site-statique)
   - [Étape 4 : Configuration CORS](#étape-4--configuration-cors)
5. [Tests et Validation](#tests-et-validation)
6. [Ressources Déployées](#ressources-déployées)
7. [Commandes Utiles](#commandes-utiles)
8. [Auteur](#auteur)

---

## 🏗️ Architecture & Objectifs

### Architecture
```
┌─────────────────┐
│  Utilisateur    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Azure Storage              │
│  (Site Web Statique)        │
└────────┬────────────────────┘
         │ Appel API
         ▼
┌─────────────────────────────┐
│  Azure API Management       │
│  (Passerelle + CORS)        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Azure Container Apps       │
│  (API Flask conteneurisée)  │
└─────────────────────────────┘
```

### Objectifs
- ✅ Déployer une API REST serverless sans gestion d'infrastructure
- ✅ Exposer l'API via une passerelle publique sécurisée
- ✅ Héberger un front-end statique avec appel API
- ✅ Configurer CORS pour autoriser les appels cross-origin
- ✅ Maîtriser Azure CLI et les services cloud Azure

---

## ⚙️ Prérequis

### Outils nécessaires
- **Compte Azure** avec une souscription active
- **Azure CLI** installé et configuré ([Documentation](https://learn.microsoft.com/fr-fr/cli/azure/install-azure-cli))
- **Docker** pour la conteneurisation (optionnel si image déjà créée)
- **Git** pour versionner le projet
- **Éditeur de code** (VS Code, PyCharm, etc.)

### Connaissances recommandées
- Bases de Python et Flask
- Notions de Docker et conteneurisation
- Connaissance de base d'Azure
- Principes HTTP et API REST
- JavaScript de base pour le front-end

### Connexion Azure
Avant de commencer, connectez-vous à Azure :
```bash
az login
```

---

## 📁 Structure du Projet

```
tp-serverless/
│
├── api/
│   ├── app.py              # Application Flask
│   ├── Dockerfile          # Image Docker
│   └── requirements.txt    # Dépendances Python
│
├── frontend/
│   ├── index.html          # Page web statique
│   └── app.js              # Script d'appel API
│
├── openapi.yaml            # Spécification OpenAPI de l'API
└── README.md               # Ce fichier
```

---

## 🚀 Déploiement Étape par Étape

### Étape 1 : Déploiement de l'API Flask (Container Apps)

#### 1.1 Créer le groupe de ressources

```bash
az group create \
  --name RG-tp-app-serverless \
  --location switzerlandnorth
```

#### 1.2 Créer un Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group RG-tp-app-serverless \
  --name tpappserverless \
  --sku Basic
```

#### 1.3 Construire et pousser l'image Docker

```bash
# Se connecter au registre
az acr login --name tpappserverless

# Construire l'image
docker build -t tpappserverless.azurecr.io/tp-app-serverless:latest ./api

# Pousser l'image
docker push tpappserverless.azurecr.io/tp-app-serverless:latest
```

#### 1.4 Créer l'environnement Container Apps

```bash
az containerapp env create \
  --name env-tp-app \
  --resource-group RG-tp-app-serverless \
  --location switzerlandnorth
```

#### 1.5 Déployer la Container App

```bash
az containerapp create \
  --name tp-app-serverless \
  --resource-group RG-tp-app-serverless \
  --environment env-tp-app \
  --image tpappserverless.azurecr.io/tp-app-serverless:latest \
  --cpu 0.5 \
  --memory 1.0Gi \
  --target-port 5000 \
  --ingress external \
  --registry-server tpappserverless.azurecr.io \
  --registry-username tpappserverless \
  --registry-password $(az acr credential show -n tpappserverless --query "passwords[0].value" -o tsv)
```

#### 1.6 Récupérer l'URL de l'API

```bash
az containerapp show \
  --name tp-app-serverless \
  --resource-group RG-tp-app-serverless \
  --query "properties.configuration.ingress.fqdn" \
  -o tsv
```

**Exemple d'URL générée :**
```
https://tp-app-serverless.agreeablefield-d4e29a2d.switzerlandnorth.azurecontainerapps.io
```

**Tester l'API directement :**
```bash
curl https://tp-app-serverless.agreeablefield-d4e29a2d.switzerlandnorth.azurecontainerapps.io/hello
```

**Réponse attendue :**
```json
{"message":"Bonjour, API Flask en mode serverless !"}
```

---

### Étape 2 : Configuration Azure API Management

#### 2.1 Créer l'instance API Management

> ⚠️ La création via le portail Azure est recommandée (plus visuel)

**Via Azure Portal :**
1. Rechercher "API Management" dans la barre de recherche
2. Cliquer sur **Créer**
3. Renseigner les informations :
   - **Groupe de ressources :** RG-tp-app-serverless
   - **Nom :** tp-apim-serverless
   - **Région :** Switzerland North
   - **Nom de l'organisation :** Votre nom ou organisation
   - **Email de l'administrateur :** Votre email
   - **Niveau tarifaire :** Consumption (pour le TP)
   - **Connectivité :** Aucun (public)
4. Créer l'instance (peut prendre 10-15 minutes)

**Via Azure CLI (alternative) :**
```bash
az apim create \
  --name tp-apim-serverless \
  --resource-group RG-tp-app-serverless \
  --location switzerlandnorth \
  --publisher-email votre-email@example.com \
  --publisher-name "Votre Nom" \
  --sku-name Consumption
```

#### 2.2 Créer une API dans APIM

**Option 1 : Import OpenAPI (recommandé)**

Créer le fichier `openapi.yaml` :

```yaml
openapi: 3.0.1
info:
  title: TP Serverless API
  description: API REST Flask déployée en mode serverless
  version: 1.0.0
servers:
  - url: https://tp-app-serverless.agreeablefield-d4e29a2d.switzerlandnorth.azurecontainerapps.io
paths:
  /hello:
    get:
      summary: Retourne un message de bienvenue
      operationId: getHello
      responses:
        '200':
          description: Succès
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: 'Bonjour, API Flask en mode serverless !'
```

**Importer via le portail :**
1. Aller dans l'instance APIM créée
2. Section **APIs** → **Add API** → **OpenAPI**
3. Sélectionner le fichier `openapi.yaml`
4. Configurer :
   - **Display name :** TP Serverless API
   - **Name :** tp-serverless-api
   - **API URL suffix :** (laisser vide ou mettre `api`)
5. Créer l'API

**Option 2 : Création manuelle**

1. Dans APIM → **APIs** → **Add API** → **HTTP**
2. Créer une nouvelle opération :
   - **Method :** GET
   - **URL :** /hello
   - **Display name :** Get Hello Message

#### 2.3 Configurer le backend

1. Dans l'API créée, aller dans **Design**
2. Sur l'opération `/hello`, cliquer sur **Backend**
3. Sélectionner **HTTP(s) endpoint**
4. Entrer l'URL : `https://tp-app-serverless.agreeablefield-d4e29a2d.switzerlandnorth.azurecontainerapps.io`
5. Sauvegarder

#### 2.4 Tester l'API via APIM

**URL de la passerelle APIM :**
```
https://tp-apim-serverless.azure-api.net/hello
```

**Tester avec curl :**
```bash
curl https://tp-apim-serverless.azure-api.net/hello
```

---

### Étape 3 : Hébergement du Site Statique

#### 3.1 Créer le compte de stockage

```bash
az storage account create \
  --name stom1infra \
  --resource-group RG-tp-app-serverless \
  --location switzerlandnorth \
  --sku Standard_LRS \
  --kind StorageV2
```

#### 3.2 Activer le site web statique

```bash
az storage blob service-properties update \
  --account-name stom1infra \
  --static-website \
  --index-document index.html \
  --404-document 404.html
```

#### 3.3 Récupérer l'URL du site statique

```bash
az storage account show \
  --name stom1infra \
  --resource-group RG-tp-app-serverless \
  --query "primaryEndpoints.web" \
  --output tsv
```

**Exemple d'URL :**
```
https://stom1infra.z1.web.core.windows.net/
```

#### 3.4 Uploader les fichiers statiques

**Via Azure Portal :**
1. Aller dans le compte de stockage `stom1infra`
2. Section **Data storage** → **Containers**
3. Sélectionner le container `$web`
4. Cliquer sur **Upload**
5. Uploader `index.html` et `app.js`

**Via Azure CLI :**
```bash
az storage blob upload-batch \
  --account-name stom1infra \
  --source ./frontend \
  --destination '$web'
```

#### 3.5 Contenu des fichiers front-end

**index.html :**
```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TP Serverless - Test API</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        button {
            background: #0078d4;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background: #005a9e;
        }
        #result {
            margin-top: 20px;
            padding: 15px;
            background: #f0f0f0;
            border-radius: 5px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 TP Serverless - Test API</h1>
        <p>Cliquez sur le bouton ci-dessous pour tester l'API déployée sur Azure.</p>
        <button onclick="testAPI()">Tester l'API</button>
        <div id="result"></div>
    </div>
    <script src="app.js"></script>
</body>
</html>
```

**app.js :**
```javascript
async function testAPI() {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '⏳ Appel de l\'API en cours...';
    
    try {
        const response = await fetch('https://tp-apim-serverless.azure-api.net/hello');
        const data = await response.json();
        
        resultDiv.innerHTML = `
            <h3>✅ Réponse de l'API :</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
            <p><strong>Statut :</strong> ${response.status} ${response.statusText}</p>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <h3>❌ Erreur :</h3>
            <p>${error.message}</p>
        `;
    }
}
```

---

### Étape 4 : Configuration CORS

#### 4.1 Pourquoi CORS ?

Le navigateur bloque par défaut les requêtes cross-origin (depuis `stom1infra.z1.web.core.windows.net` vers `tp-apim-serverless.azure-api.net`) pour des raisons de sécurité. Il faut donc configurer CORS dans Azure API Management.

#### 4.2 Ajouter la politique CORS dans APIM

**Via le portail Azure :**

1. Aller dans l'instance APIM → **APIs** → Sélectionner votre API
2. Cliquer sur l'opération **GET /hello** (ou "All operations" pour toute l'API)
3. Dans **Inbound processing**, cliquer sur **Add policy**
4. Sélectionner **Allow cross-origin resource sharing (CORS)**
5. Configurer :
   - **Allowed origins :** `https://stom1infra.z1.web.core.windows.net`
   - **Allowed methods :** `GET`, `OPTIONS`
   - **Allowed headers :** `*`
   - **Exposed headers :** `*`
   - **Allow credentials :** Décoché
   - **Max age :** `3600`
6. Sauvegarder

**Via l'éditeur XML (méthode alternative) :**

1. Dans **Inbound processing**, cliquer sur le code XML (`</>`)
2. Ajouter la politique CORS **en premier** dans le bloc `<inbound>` :

```xml
<policies>
    <inbound>
        <cors allow-credentials="false">
            <allowed-origins>
                <origin>https://stom1infra.z1.web.core.windows.net</origin>
            </allowed-origins>
            <allowed-methods preflight-result-max-age="3600">
                <method>GET</method>
                <method>OPTIONS</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
            <expose-headers>
                <header>*</header>
            </expose-headers>
        </cors>
        <base />
        <set-backend-service backend-id="ContainerApp_tp-app-serverless" />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
```

3. Sauvegarder

#### 4.3 Points importants

- ⚠️ **Ne pas créer d'opération OPTIONS manuelle** dans l'API : APIM gère automatiquement la réponse preflight
- ⚠️ La politique CORS doit être **en premier** dans le bloc `<inbound>`
- ⚠️ Remplacer `https://stom1infra.z1.web.core.windows.net` par votre vraie URL de site statique

---

## ✅ Tests et Validation

### Test 1 : API directement (Container Apps)

```bash
curl https://tp-app-serverless.agreeablefield-d4e29a2d.switzerlandnorth.azurecontainerapps.io/hello
```

**Résultat attendu :**
```json
{"message":"Bonjour, API Flask en mode serverless !"}
```

### Test 2 : API via APIM

```bash
curl https://tp-apim-serverless.azure-api.net/hello
```

**Résultat attendu :**
```json
{"message":"Bonjour, API Flask en mode serverless !"}
```

### Test 3 : CORS avec header Origin

```bash
curl -H "Origin: https://stom1infra.z1.web.core.windows.net" -I https://tp-apim-serverless.azure-api.net/hello
```

**Vérifier la présence de l'en-tête dans la réponse :**
```
Access-Control-Allow-Origin: https://stom1infra.z1.web.core.windows.net
```

### Test 4 : Site statique dans le navigateur

1. Ouvrir `https://stom1infra.z1.web.core.windows.net/` dans un navigateur
2. Cliquer sur **Tester l'API**
3. Vérifier que la réponse s'affiche sans erreur CORS

**Vérification dans la console développeur (F12) :**
- Onglet **Réseau (Network)** → Cliquer sur la requête vers `/hello`
- Dans **Headers → Response Headers**, vérifier :
  ```
  Access-Control-Allow-Origin: https://stom1infra.z1.web.core.windows.net
  ```
- Aucune erreur CORS dans l'onglet **Console**

---

## 🔗 Ressources Déployées

| Ressource | Type | URL/Nom |
|-----------|------|---------|
| **Groupe de ressources** | Resource Group | `RG-tp-app-serverless` |
| **Container Registry** | ACR | `tpappserverless.azurecr.io` |
| **Container App** | Azure Container Apps | `https://tp-app-serverless.agreeablefield-d4e29a2d.switzerlandnorth.azurecontainerapps.io` |
| **API Management** | APIM | `https://tp-apim-serverless.azure-api.net` |
| **Site statique** | Azure Storage | `https://stom1infra.z1.web.core.windows.net` |

---

## 📝 Commandes Utiles

### Lister les ressources du groupe
```bash
az resource list --resource-group RG-tp-app-serverless --output table
```

### Voir les logs de la Container App
```bash
az containerapp logs show \
  --name tp-app-serverless \
  --resource-group RG-tp-app-serverless \
  --follow
```

### Mettre à jour l'image de la Container App
```bash
az containerapp update \
  --name tp-app-serverless \
  --resource-group RG-tp-app-serverless \
  --image tpappserverless.azurecr.io/tp-app-serverless:v2
```

### Supprimer toutes les ressources
```bash
az group delete --name RG-tp-app-serverless --yes --no-wait
```

---

## 👤 Auteur

**Grégory Myscile**  
Étudiant en Mastère 1 – Expert Cloud, Sécurité et Infrastructure  
Ynov Bordeaux – Promotion 2025

📧 Contact : [kingston-run]  
🔗 GitLab : [https://gitlab.com/ynov-infra-m1/tp-app-serverless](https://gitlab.com/ynov-infra-m1/tp-app-serverless)

---

## 📚 Ressources et Documentation

- [Azure Container Apps](https://learn.microsoft.com/fr-fr/azure/container-apps/)
- [Azure API Management](https://learn.microsoft.com/fr-fr/azure/api-management/)
- [Azure Storage Static Website](https://learn.microsoft.com/fr-fr/azure/storage/blobs/storage-blob-static-website)
- [Politique CORS dans APIM](https://learn.microsoft.com/fr-fr/azure/api-management/cors-policy)
- [Azure CLI Reference](https://learn.microsoft.com/fr-fr/cli/azure/)

---

**✨ Projet réalisé dans le cadre du TP Serverless – YNOV Bordeaux 2025**
