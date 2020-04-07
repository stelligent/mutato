#! bash -eux

VAULT_PROFILE=${1-"mutato-dev"}
docker build --no-cache -t stelligent/mutato .
echo "NPM_TOKEN=$NPM_TOKEN" > mutato.env
echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> mutato.env
echo "DOCKER_USERNAME=$DOCKER_USERNAME" >> mutato.env
echo "DOCKER_PASSWORD=$DOCKER_PASSWORD" >> mutato.env
aws-vault exec $VAULT_PROFILE -- env | grep AWS_ >> mutato.env
docker run -it --rm --env-file mutato.env -v `pwd`:/project stelligent/mutato deploy
