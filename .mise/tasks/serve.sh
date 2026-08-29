#!/usr/bin/env bash
#MISE description="Start offline docs search server (dev)"

cd "${MISE_PROJECT_ROOT}/serve"
[ ! -d node_modules ] && yarn install
yarn dev
