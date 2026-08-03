const https = require("https");

const options = {
  hostname: "api.github.com",
  path: "/repos/Omar3-4/Private-Repo/actions/runs",
  method: "GET",
  headers: {
    "User-Agent": "Node.js",
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    const json = JSON.parse(data);
    if (json.workflow_runs) {
      const runs = json.workflow_runs.slice(0, 2);
      runs.forEach((run) => {
        console.log(`Workflow: ${run.name}`);
        console.log(`Status: ${run.status}, Conclusion: ${run.conclusion}`);
        console.log(`Jobs URL: ${run.jobs_url}`);
      });
    } else {
      console.log(json);
    }
  });
});
req.end();
