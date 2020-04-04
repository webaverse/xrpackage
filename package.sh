#!/bin/bash
find . -name '*.pem' | xargs rm
echo now package the extension to .crx in chrome