ARG NGINX_IMAGE=registry.cn-chengdu.aliyuncs.com/acs/nginx:nginx
FROM ${NGINX_IMAGE}
COPY ./apps/web-antd/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
