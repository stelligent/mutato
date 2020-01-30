# Mutato

Semi stealth project related to CDK constructs. The truth is out there.


## Getting started

Currently, there are no prequisites to getting started.

Pull the project and run `npm install`.

Verify the installation was successfull with `npm build`


## Q & A

**Q)** When I run `npm install` I get a `gyp ERR` error `(Error: Command failed: {home}/.pyenv/shims/python -c import sys; print "%s.%s.%s" % sys.version_info[:3];)`. What gives?

**A)** Your node gyp is using python 3+ to execute a non python 3+ compatible script. You can either:
* Switch the python versios to one supported by that gyp version (i.e. 2.7.10) using pyenv or similar _(preferred)_
* Update the gyp version to one compatible with [python 3](https://github.com/nodejs/node-gyp/tree/v6.1.0)
	
Then, rerun `npm install`. 

