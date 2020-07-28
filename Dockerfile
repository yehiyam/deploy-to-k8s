FROM node:14.5.0
ADD ./dist/* /deploy-k8s-action/
ENTRYPOINT [ "node","/deploy-k8s-action/index.js" ]