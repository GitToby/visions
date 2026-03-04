# Root justfile

mod frontend
mod backend

default:
    @just --list

init: frontend::init backend::init

check: frontend::check backend::check

lint: frontend::lint backend::lint check

test: frontend::test backend::test
