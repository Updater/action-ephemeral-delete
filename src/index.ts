import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
    try {
        const context = github.context;

        const token = core.getInput("gh_token", { required: true });
        const productName = core.getInput("product_name", { required: true });
        const ref = core.getInput("ref", { required: true });

        console.log(ref);

        const octokit = github.getOctokit(token);

        const deployment = await octokit.rest.repos.listDeployments({
            ...context.repo,
            ref,
            environment: "review",
        });

        if (deployment.data.length === 0) {
            throw new Error("No deployment found");
        }

        const deploymentId = deployment.data[0].id.toString();
        const branch = ref.split("/")[2];

        const workflowDispatch = await octokit.rest.actions.createWorkflowDispatch({
            owner: "Updater",
            repo: "kubernetes-clusters",
            workflow_id: "ephemeral_delete.yaml",
            ref: "main",
            inputs: {
                branch: branch,
                product_name: productName,
                repository_name: context.repo.repo,
                deployment_id: deploymentId
            }
        });

        if(workflowDispatch.status !== 204){
            throw new Error(`Failed to create workflow dispatch: ${workflowDispatch.status}`);
        }

    } catch (error) {
        //@ts-ignore
        core.error(error);
        //@ts-ignore
        core.setFailed(error.message);
    }
}

run();