#!/bin/sh

#backend
cp ./docker/backend/* ./backend/

#frontend
localhostIP="127.0.0.1"
cp ./docker/frontend/* ./frontend
rsync -a --copy-links --exclude=/nginx/README.md ./nginx ./frontend
sed -i "
  s/${localhostIP}:80/0.0.0.0:__MEMPOOL_FRONTEND_HTTP_PORT__/g
  s/${localhostIP}/0.0.0.0/g
  s/user nobody;//g
" ./frontend/nginx/nginx.conf
sed -i "
  s/${localhostIP}:8999/__MEMPOOL_BACKEND_MAINNET_HTTP_HOST__:__MEMPOOL_BACKEND_MAINNET_HTTP_PORT__/g
" ./frontend/nginx/mempool/mempool.conf
