echo "参数为: $1"
# export NODE_OPTIONS=--openssl-legacy-provider && npm run start-local
cd $1 && export NODE_OPTIONS=--openssl-legacy-provider && npm run start-local
