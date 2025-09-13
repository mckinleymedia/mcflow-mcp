#!/bin/bash

# McFlow MCP Server - AI Agent Setup Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}McFlow MCP Server - AI Agent Setup${NC}"
echo "===================================="
echo ""

# Get the absolute path of the mcflow-mcp directory (parent of scripts)
MCFLOW_PATH="$(cd "$(dirname "$0")/.." && pwd)"

# Array to track detected agents
declare -a DETECTED_AGENTS=()

# Function to detect installed AI agents
detect_agents() {
    echo -e "${CYAN}Detecting installed AI agents...${NC}"
    echo ""
    
    # Claude Desktop
    if [ -d "$HOME/Library/Application Support/Claude" ] || [ -f "$HOME/Library/Application Support/Claude/claude_desktop_config.json" ]; then
        DETECTED_AGENTS+=("claude")
        echo -e "  ${GREEN}✓${NC} Claude Desktop detected"
    fi
    
    # Cursor
    if [ -d "$HOME/.cursor" ] || [ -f "$HOME/.cursor/mcp/config.json" ] || [ -d "/Applications/Cursor.app" ]; then
        DETECTED_AGENTS+=("cursor")
        echo -e "  ${GREEN}✓${NC} Cursor detected"
    fi
    
    # Windsurf
    if [ -d "$HOME/.windsurf" ] || [ -f "$HOME/.windsurf/mcp/config.json" ] || [ -d "/Applications/Windsurf.app" ]; then
        DETECTED_AGENTS+=("windsurf")
        echo -e "  ${GREEN}✓${NC} Windsurf detected"
    fi
    
    # Continue
    if [ -d "$HOME/.continue" ] || [ -f "$HOME/.continue/config.json" ]; then
        DETECTED_AGENTS+=("continue")
        echo -e "  ${GREEN}✓${NC} Continue detected"
    fi
    
    # Cody
    if [ -d "$HOME/.cody" ] || [ -f "$HOME/.cody/mcp-servers.json" ]; then
        DETECTED_AGENTS+=("cody")
        echo -e "  ${GREEN}✓${NC} Cody detected"
    fi
    
    # Cline
    if [ -f "$HOME/.vscode/extensions/saoudrizwan.claude-dev-*/package.json" ] || \
       [ -f "$HOME/.cursor/extensions/saoudrizwan.claude-dev-*/package.json" ]; then
        DETECTED_AGENTS+=("cline")
        echo -e "  ${GREEN}✓${NC} Cline (VSCode/Cursor extension) detected"
    fi
    
    # Check for MCP config files in current repo
    if [ -f "mcp.json" ] || [ -f ".mcp/config.json" ] || [ -f "mcp-config.json" ]; then
        echo -e "  ${YELLOW}!${NC} Found MCP config files in current repository"
    fi
    
    echo ""
    
    if [ ${#DETECTED_AGENTS[@]} -eq 0 ]; then
        echo -e "${YELLOW}No AI agents detected. You can still configure them manually.${NC}"
        echo ""
    else
        echo -e "${GREEN}Found ${#DETECTED_AGENTS[@]} AI agent(s) on your system${NC}"
        echo ""
    fi
}

# Function to create config for different agents
setup_claude() {
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    mkdir -p "$(dirname "$CONFIG_PATH")"
    
    echo -e "${YELLOW}Setting up Claude Desktop...${NC}"
    
    # Check if config exists and has content
    if [ -f "$CONFIG_PATH" ] && [ -s "$CONFIG_PATH" ]; then
        echo -e "${YELLOW}Existing Claude config found. Backing up to ${CONFIG_PATH}.backup${NC}"
        cp "$CONFIG_PATH" "$CONFIG_PATH.backup"
    fi
    
    cat > "$CONFIG_PATH" <<EOF
{
  "mcpServers": {
    "mcflow": {
      "command": "node",
      "args": ["$MCFLOW_PATH/dist/index.js"],
      "env": {
        "WORKFLOWS_PATH": "../"
      }
    }
  }
}
EOF
    echo -e "${GREEN}✓ Claude Desktop configured${NC}"
}

setup_cursor() {
    CONFIG_PATH="$HOME/.cursor/mcp/config.json"
    mkdir -p "$(dirname "$CONFIG_PATH")"
    
    echo -e "${YELLOW}Setting up Cursor...${NC}"
    
    if [ -f "$CONFIG_PATH" ] && [ -s "$CONFIG_PATH" ]; then
        echo -e "${YELLOW}Existing Cursor config found. Backing up to ${CONFIG_PATH}.backup${NC}"
        cp "$CONFIG_PATH" "$CONFIG_PATH.backup"
    fi
    
    cat > "$CONFIG_PATH" <<EOF
{
  "servers": {
    "mcflow": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "$MCFLOW_PATH",
      "env": {
        "WORKFLOWS_PATH": "../"
      }
    }
  }
}
EOF
    echo -e "${GREEN}✓ Cursor configured${NC}"
}

setup_windsurf() {
    CONFIG_PATH="$HOME/.windsurf/mcp/config.json"
    mkdir -p "$(dirname "$CONFIG_PATH")"
    
    echo -e "${YELLOW}Setting up Windsurf...${NC}"
    
    if [ -f "$CONFIG_PATH" ] && [ -s "$CONFIG_PATH" ]; then
        echo -e "${YELLOW}Existing Windsurf config found. Backing up to ${CONFIG_PATH}.backup${NC}"
        cp "$CONFIG_PATH" "$CONFIG_PATH.backup"
    fi
    
    cat > "$CONFIG_PATH" <<EOF
{
  "mcp_servers": {
    "mcflow": {
      "type": "stdio",
      "command": "$MCFLOW_PATH/scripts/start-mcp.sh",
      "env": {
        "WORKFLOWS_PATH": "../"
      }
    }
  }
}
EOF
    echo -e "${GREEN}✓ Windsurf configured${NC}"
}

setup_continue() {
    CONFIG_PATH="$HOME/.continue/config.json"
    
    echo -e "${YELLOW}Setting up Continue...${NC}"
    echo -e "${RED}Note: You'll need to manually add the following to your Continue config:${NC}"
    cat <<EOF

"mcpServers": [
  {
    "name": "mcflow",
    "command": "node",
    "args": ["$MCFLOW_PATH/dist/index.js"],
    "env": {
      "WORKFLOWS_PATH": "../"
    }
  }
]
EOF
    echo ""
}

setup_cody() {
    CONFIG_PATH="$HOME/.cody/mcp-servers.json"
    mkdir -p "$(dirname "$CONFIG_PATH")"
    
    echo -e "${YELLOW}Setting up Cody...${NC}"
    
    if [ -f "$CONFIG_PATH" ] && [ -s "$CONFIG_PATH" ]; then
        echo -e "${YELLOW}Existing Cody config found. Backing up to ${CONFIG_PATH}.backup${NC}"
        cp "$CONFIG_PATH" "$CONFIG_PATH.backup"
    fi
    
    cat > "$CONFIG_PATH" <<EOF
{
  "servers": [
    {
      "name": "mcflow",
      "protocol": "stdio",
      "command": "node",
      "args": ["$MCFLOW_PATH/dist/index.js"],
      "environment": {
        "WORKFLOWS_PATH": "../"
      }
    }
  ]
}
EOF
    echo -e "${GREEN}✓ Cody configured${NC}"
}

setup_cline() {
    echo -e "${YELLOW}Setting up Cline...${NC}"
    echo -e "${RED}Note: Cline configuration must be done through VSCode/Cursor settings.${NC}"
    echo "Add this to your VSCode/Cursor settings.json:"
    cat <<EOF

"claude-dev.mcpServers": {
  "mcflow": {
    "command": "node",
    "args": ["$MCFLOW_PATH/dist/index.js"],
    "env": {
      "WORKFLOWS_PATH": "../"
    }
  }
}
EOF
    echo ""
}

# Function to prompt for confirmation
confirm_setup() {
    local agent_name=$1
    local agent_display=$2
    
    read -p "Configure McFlow for ${agent_display}? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Change to project root directory
cd "$MCFLOW_PATH"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build the project
echo -e "${YELLOW}Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Project built${NC}"
echo ""

# Detect installed agents
detect_agents

# If agents were detected, offer to configure them
if [ ${#DETECTED_AGENTS[@]} -gt 0 ]; then
    echo -e "${BLUE}Would you like to configure McFlow for the detected agents?${NC}"
    echo ""
    
    if [ ${#DETECTED_AGENTS[@]} -gt 1 ]; then
        echo "Options:"
        echo "1) Configure all detected agents"
        echo "2) Choose which agents to configure"
        echo "3) Manual selection"
        echo "4) Skip configuration"
        echo ""
        read -p "Enter choice [1-4]: " choice
        
        case $choice in
            1)
                echo ""
                for agent in "${DETECTED_AGENTS[@]}"; do
                    case $agent in
                        claude) setup_claude ;;
                        cursor) setup_cursor ;;
                        windsurf) setup_windsurf ;;
                        continue) setup_continue ;;
                        cody) setup_cody ;;
                        cline) setup_cline ;;
                    esac
                done
                ;;
            2)
                echo ""
                for agent in "${DETECTED_AGENTS[@]}"; do
                    case $agent in
                        claude) 
                            if confirm_setup "$agent" "Claude Desktop"; then
                                setup_claude
                            fi
                            ;;
                        cursor)
                            if confirm_setup "$agent" "Cursor"; then
                                setup_cursor
                            fi
                            ;;
                        windsurf)
                            if confirm_setup "$agent" "Windsurf"; then
                                setup_windsurf
                            fi
                            ;;
                        continue)
                            if confirm_setup "$agent" "Continue"; then
                                setup_continue
                            fi
                            ;;
                        cody)
                            if confirm_setup "$agent" "Cody"; then
                                setup_cody
                            fi
                            ;;
                        cline)
                            if confirm_setup "$agent" "Cline"; then
                                setup_cline
                            fi
                            ;;
                    esac
                done
                ;;
            3)
                # Fall through to manual menu
                ;;
            4)
                echo -e "${YELLOW}Skipping agent configuration${NC}"
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                exit 1
                ;;
        esac
    else
        # Only one agent detected
        agent="${DETECTED_AGENTS[0]}"
        case $agent in
            claude) agent_name="Claude Desktop" ;;
            cursor) agent_name="Cursor" ;;
            windsurf) agent_name="Windsurf" ;;
            continue) agent_name="Continue" ;;
            cody) agent_name="Cody" ;;
            cline) agent_name="Cline" ;;
            *) agent_name="$agent" ;;
        esac
        
        if confirm_setup "$agent" "$agent_name"; then
            case $agent in
                claude) setup_claude ;;
                cursor) setup_cursor ;;
                windsurf) setup_windsurf ;;
                continue) setup_continue ;;
                cody) setup_cody ;;
                cline) setup_cline ;;
            esac
        fi
    fi
    
    # If user chose manual selection (option 3), show the menu
    if [ "$choice" == "3" ]; then
        echo ""
        echo "Manual agent selection:"
        echo "1) Claude Desktop"
        echo "2) Cursor"
        echo "3) Windsurf"
        echo "4) Continue"
        echo "5) Cody"
        echo "6) Cline"
        echo "7) All agents"
        echo "8) Skip"
        echo ""
        read -p "Enter choice [1-8]: " manual_choice
        
        case $manual_choice in
            1) setup_claude ;;
            2) setup_cursor ;;
            3) setup_windsurf ;;
            4) setup_continue ;;
            5) setup_cody ;;
            6) setup_cline ;;
            7) 
                setup_claude
                setup_cursor
                setup_windsurf
                setup_cody
                setup_cline
                echo ""
                setup_continue
                ;;
            8) echo -e "${YELLOW}Skipping agent configuration${NC}" ;;
            *) echo -e "${RED}Invalid choice${NC}" ; exit 1 ;;
        esac
    fi
else
    # No agents detected, show manual menu
    echo "Select which AI agent to configure:"
    echo "1) Claude Desktop"
    echo "2) Cursor"
    echo "3) Windsurf"
    echo "4) Continue"
    echo "5) Cody"
    echo "6) Cline"
    echo "7) All agents"
    echo "8) Skip (manual setup)"
    echo ""
    read -p "Enter choice [1-8]: " choice
    
    case $choice in
        1) setup_claude ;;
        2) setup_cursor ;;
        3) setup_windsurf ;;
        4) setup_continue ;;
        5) setup_cody ;;
        6) setup_cline ;;
        7) 
            setup_claude
            setup_cursor
            setup_windsurf
            setup_cody
            setup_cline
            echo ""
            setup_continue
            ;;
        8) echo -e "${YELLOW}Skipping agent configuration${NC}" ;;
        *) echo -e "${RED}Invalid choice${NC}" ; exit 1 ;;
    esac
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart your AI agent application(s)"
echo "  2. Open a project with n8n workflows"
echo "  3. Use 'McFlow' commands to manage workflows"
echo ""
echo "Available McFlow commands:"
echo "  • McFlow list - List workflows in project"
echo "  • McFlow deploy - Deploy workflows to n8n"
echo "  • McFlow validate - Check workflows for issues"
echo "  • McFlow credentials --action analyze - Check credential requirements"
echo ""
echo "For more information, see docs/INTEGRATIONS.md"