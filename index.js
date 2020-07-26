const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs-extra');
const exec = require('@actions/exec');
const path = require('path');
const jsYaml = require('js-yaml');
const regex = /^core\/(.+)\/.*$/;
const regexBranchName = /^refs\/heads\/(.+)/;
const workspace = process.env.GITHUB_WORKSPACE;

const getPrNumber = () => {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return core.getInput('prNumber');
    }
    return pullRequest.number;
}

const getBranchName = (ref) => {
    const match = ref.match(regexBranchName);
    return match && match.length >= 2 && match[1]
}

const getChangedServices = async (client, prNumber, repo) => {
    const listFilesResponse = await client.pulls.listFiles({
        ...repo,
        pull_number: prNumber
    });

    const changedFiles = listFilesResponse.data.map(f => f.filename);

    core.debug('found changed files:');
    const changedServices = new Set();
    for (const file of changedFiles) {
        const match = file.match(regex);
        if (match && match.length >= 2) {
            changedServices.add(match[1])
        }
    }
    return [...changedServices.keys()];
}

// most @actions toolkit packages have async methods
async function run() {
    try {
        core.debug(`workspace: ${workspace}`)

        // const token = core.getInput('repo-token', { required: true });
        // const client = github.getOctokit(token);
        const prNumber = getPrNumber();
        if (!prNumber) {
            throw new Error('Could not get pull request number from context, exiting');
        }
        core.debug(`fetching changed services for pr #${prNumber}`);
        // const changedServices = await getChangedServices(client, prNumber, {
        //     owner: github.context.repo.owner,
        //     repo: github.context.repo.repo,
        // });
        const changedServices=['worker'];
        const branchName = getBranchName(github.context.ref) || process.env['GITHUB_HEAD_REF'];
        core.info(`building branch ${branchName}`);
        core.info(`changed services: ${changedServices}`);
        const helmValuesFile = path.join(workspace,'helm','hkube','values.yaml');
        const values = jsYaml.safeLoad(await fs.readFile(helmValuesFile));
        for (const service of changedServices) {
            const cwd = path.join(workspace, 'core', service);
            const packageJson = await fs.readJson(path.join(cwd, 'package.json'));
            const versionFromPackage = packageJson.version;
            const version = `v${versionFromPackage}-${branchName}-${github.context.runId}`
            core.info(`building ${service} with version ${version}`);
            const env = {
                ...process.env,
                TRAVIS_PULL_REQUEST: 'true',
                TRAVIS_PULL_REQUEST_BRANCH: branchName,
                TRAVIS_JOB_NUMBER: `${github.context.runId}`,
                PRIVATE_REGISTRY:'docker.io/yehiyam'
            }
            await exec.exec('npm', ['run', 'build'], {
                cwd,
                env
            });
            const serviceNameHelm=service.replace('-','_');
            values[serviceNameHelm].image.tag=version;
        }
        await fs.writeFile(helmValuesFile,jsYaml.safeDump(values))
        core.setOutput('version', `v${branchName}-${github.context.runId}`)

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();


module.exports = {
    getChangedServices,
    getBranchName
}