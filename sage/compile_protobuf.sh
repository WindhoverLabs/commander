#!/bin/bash

protoc -I=${PWD} --python_out=${PWD} ${PWD}/message.proto
