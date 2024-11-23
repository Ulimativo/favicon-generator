# Use lightweight nginx image
FROM nginx:alpine

# Install required tools
RUN apk add --no-cache bash curl

# Copy project files
COPY . /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 