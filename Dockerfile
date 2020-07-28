FROM node:14.5.0-slim
ADD ./dist/* /deploy-k8s-action/
CMD [ "node","/deploy-k8s-action/index.js" ]