const axios = require("axios");
const projectUsers = require("./github-project-user.json");

// const CHANNEL = "#develop";
// const issueRepo = "";
const { ReactionHandler } = require("emoji-to-issue");

exports.otochan = (req, res) => {
  console.log("Received request:", req.body);

  if (req.body.challenge) {
    res.send(req.body.challenge)
    return;
  }

  // slack event
  if (req.body.event) {
    handleSlack(req, res);
    return;
  }
};

function handleSlack(req, res) {
  const event = req.body.event;
  if (event.type === "app_mention") {
    const text = event.text;
    const textBody = text.replace(/^\<[^\>]+\>\s*/, "");

    if (/^yo/.test(textBody)) {
      res.send("ok");

      postMessage(event.channel, "yo").catch(err => {
        console.error(err);
      });
    }

    return;
  }

  const handler = new ReactionHandler({ issueRepo });
  if (handler.match(event)) {
    handler
      .handle(event)
      .then(issue => {
        return bindProjectIfNeeded(issue);
      })
      .then(() => {
        res.send("ok");
      })
      .catch(err => {
        console.error(err);
        res.status(500).send(err.message);
      });

    return;
  }

  res.send("ok: no matched handler");
}

async function bindProjectIfNeeded(issue) {
  if (!issue.assignee) return;

  const projectName = Object.keys(projectUsers).find(project => {
    const usernames = projectUsers[project];
    return usernames.includes(issue.assignee.login);
  });

  if (projectName) {
    const project = await findProject(issueRepo, projectName);
    if (!project) {
      throw new Error("Project not found");
    }

    await addIssueToProject(project, issue);
  }
}

function apiHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

async function postMessage(channel, text) {
  const token = process.env.SLACK_TOKEN;

  await axios.post(
    "https://slack.com/api/chat.postMessage",
    {
      channel: channel,
      text: text,
      icon_emoji: ":chicken:"
    },
    {
      headers: apiHeaders(token)
    }
  );
}

function headersForGithubProject() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.inertia-preview+json"
  };
}

async function findProject(repo, name) {
  const res = await axios.get(`https://api.github.com/repos/${repo}/projects`, {
    headers: headersForGithubProject()
  });
  const project = res.data.find(project => project.name === name);
  return project;
}

async function addIssueToProject(project, issue) {
  const columnsResponse = await axios.get(project.columns_url, {
    headers: headersForGithubProject()
  });
  const column = columnsResponse.data[0];
  const res = await axios.post(
    column.cards_url,
    { content_id: issue.id, content_type: "Issue" },
    { headers: headersForGithubProject() }
  );
  return res.data;
}
