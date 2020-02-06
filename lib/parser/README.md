# Mu's parser

Mu's parser is an umbrella term used to identify a collection of components that
are wired up together so they can read, preprocess, parse and emit the JSON tree
Mu uses for constructs initialization.

This is how everything is wired up:

```text
mu.yml >   Nunjucks    > YAML parser > JSON > JSON schema validation > objects
                          |              |
         PreProcessor  >  |_  Converter _|  >       Validator
              |                                         |
              |_               Parser                  _|
```
