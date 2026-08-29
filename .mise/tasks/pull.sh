#!/usr/bin/env bash
#MISE description="Pull submodules and PHP manual"
#MISE depends=["pull:php"]

git submodule update --init --remote --merge
