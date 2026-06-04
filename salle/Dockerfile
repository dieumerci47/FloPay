FROM node:18-alpine

WORKDIR /app

# Copie des fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Installation des dépendances
RUN npm install

# Copie du reste du code
COPY . .

# Exposition du port
EXPOSE 3000

# Démarrage en mode dev
CMD ["npm", "run", "dev"]
