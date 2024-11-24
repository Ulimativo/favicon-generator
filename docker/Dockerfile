FROM nginx:alpine

# Copy static files
COPY src/index.html /usr/share/nginx/html/
COPY src/css/styles.css /usr/share/nginx/html/
COPY src/js/script.js /usr/share/nginx/html/

# Copy favicon files
COPY src/assets/icons/favicon.ico /usr/share/nginx/html/
COPY src/assets/icons/favicon-16x16.png /usr/share/nginx/html/
COPY src/assets/icons/favicon-32x32.png /usr/share/nginx/html/
COPY src/assets/icons/apple-touch-icon.png /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]