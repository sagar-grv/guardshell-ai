# Open-Source Model Evidence

GuardShell supports a local open-source language model through Ollama. The model does **not** make policy decisions or execute Linux commands. It receives a pre-classified review record and returns one short explanation for the operator.

## Model role

| Function | Deterministic policy engine | Local Ollama model |
| --- | --- | --- |
| Risk classification | Yes | No |
| Block/allow/guide/confirm decision | Yes | No |
| Remediation plan | Yes | No |
| Safe-run eligibility | Yes | No |
| Plain-language explanation | Fallback | Yes, when available |

## Required demo setup

Install Ollama on the Linux demo machine using its official distribution instructions, then download an open-source model before recording.

```bash
ollama pull llama3.2
ollama list
python3 cli/guardshell.py review --ollama-model llama3.2 -- "sudo systemctl restart nginx"
```

The output should identify an explanation source similar to `deterministic-policy + ollama:llama3.2` and include a `Local model note`. The risk, policy decision, evidence, and runbook must remain unchanged from the deterministic review.

## Evidence to show in the video

1. Run `ollama list` to show the local model is installed.
2. Run a GuardShell review with `--ollama-model llama3.2`.
3. Point out the deterministic policy decision and the model explanation note.
4. Run the same dangerous command without the model, demonstrating that the policy decision is identical.

This proves that GuardShell uses a local open-source model for explanation while retaining an enforceable safety boundary.
