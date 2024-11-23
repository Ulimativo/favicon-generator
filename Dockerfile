FROM nginx:alpine

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Copy favicon files
COPY favicon.ico /usr/share/nginx/html/
COPY favicon-16x16.png /usr/share/nginx/html/
COPY favicon-32x32.png /usr/share/nginx/html/
COPY apple-touch-icon.png /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]