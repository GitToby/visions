# Root justfile

mod frontend
mod backend

default:
    @just --list

init: frontend::init backend::init

lint: frontend::lint backend::lint

check: frontend::check backend::check

test: frontend::test backend::test
