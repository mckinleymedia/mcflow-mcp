# Extracted Nodes

This directory contains content extracted from n8n nodes for better editing and version control.

## Structure

```
nodes/
├── README.md
├── .metadata.json        # Metadata about extracted nodes
├── code/                 # Code nodes (JavaScript/Python)
│   └── workflow-name/
│       ├── node-name.js
│       └── node-name.py
├── prompts/             # LLM prompts
│   └── workflow-name/
│       ├── node-name.md
│       └── node-name.txt
├── sql/                 # SQL queries
│   └── workflow-name/
│       └── query-name.sql
├── templates/           # HTML/Text templates
│   └── workflow-name/
│       └── template.html
└── shared/             # Shared modules
    ├── utils.js
    └── prompts/
        └── system-prompt.md
```

## Usage

1. Extract nodes: `McFlow extract-nodes`
2. Edit files with your preferred editor
3. Deploy with automatic injection: `McFlow deploy`

## Benefits

- **Code**: Syntax highlighting, linting, debugging
- **Prompts**: Markdown formatting, version control
- **SQL**: Query validation, formatting
- **Templates**: HTML preview, syntax checking
