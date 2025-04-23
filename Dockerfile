FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 5000

# These environment variables will be overridden by the platform
# They're defined here as a fallback
ENV NODE_ENV=production
ENV PORT=5000

# Google OAuth related environment variables are required for Gmail integration
# These will be provided by environment variables at runtime
# ENV GOOGLE_CLIENT_ID=
# ENV GOOGLE_CLIENT_SECRET=
# ENV APP_URL=

# Database related environment variables
# ENV DATABASE_URL=

# OpenAI related environment variables
# ENV OPENAI_API_KEY=

# Start the application
CMD ["npm", "start"]