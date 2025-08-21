# Scaling

How would you design the app’s backend to handle 100k+ concurrent users?

```
To reliably support 100k+ concurrent users, I would use a horizontally scalable API architecture―for example, AWS Lambda or containerized services (ECS/EKS) behind a load balancer. The data layer would run on Amazon RDS Postgres in Multi-AZ mode for HA, with read replicas for scaling heavy read traffic, and RDS Proxy for connection pooling. For speed, ElastiCache Redis would cache frequent queries and session tokens. The infrastructure should be provisioned as code (IaC), and monitored with AWS CloudWatch and alarms to proactively manage scaling and errors. Integration and load testing should validate scaling assumptions under peak load.
```

# CI/CD

How would you set up continuous deployment for React Native + AWS?

```
For React Native, I’d use Expo Application Services (EAS) or GitHub Actions to automate building and publishing app updates (including over-the-air updates). For backend (AWS), I’d use infrastructure-as-code (e.g., AWS CDK/Terraform) and a CI/CD pipeline (GitHub Actions or AWS CodePipeline), automating lint/test/deploy for Lambda/APIs. Environment variables and secrets should be managed securely (e.g., via AWS Secrets Manager or SSM), and deployments would promote artifacts from staging to production after passing all checks. Each commit would run tests; merges to main would trigger deployment. Rollbacks and monitoring ensure any faulty deploy is quickly remediated.
```

# Team Workflow

How do you ensure fast iteration without sacrificing code quality?

```
I adopt trunk-based development with short-lived feature branches, mandatory automated testing, and peer reviews for all PRs. Code linting, formatting, and type checks run in CI, enforcing high standards for every merge. For speed, we set clear coding standards and review guidelines, empowered by a strong culture of feedback. Frequent but small releases, feature toggles, and robust rollback strategies reduce risk while enabling teams to ship features rapidly. Regular retrospectives help refine process bottlenecks and reinforce quality as a team priority.
```
