#!/bin/bash

# Linux/Mac shell script to switch network configurations
echo ""
echo "PHILIX Finance - Network Configuration Switcher"
echo "============================================="
echo ""

show_help() {
    echo "Usage: ./switch-network.sh [command]"
    echo ""
    echo "Commands:"
    echo "  help                    - Show this help"
    echo "  list                    - Show available network configurations"
    echo "  current                 - Show current configuration and IP"
    echo "  localhost              - Switch to localhost configuration"
    echo "  home_wifi              - Switch to home WiFi configuration"
    echo "  office_wifi            - Switch to office WiFi configuration"
    echo "  mobile_hotspot         - Switch to mobile hotspot configuration"
    echo "  custom                 - Setup custom IP configuration"
    echo ""
    echo "Examples:"
    echo "  ./switch-network.sh mobile_hotspot"
    echo "  ./switch-network.sh localhost"
    echo "  ./switch-network.sh current"
}

if [ $# -eq 0 ] || [ "$1" = "help" ]; then
    show_help
    exit 0
fi

case "$1" in
    "list")
        node network-config.js list
        ;;
    "current")
        node network-config.js current
        ;;
    *)
        node network-config.js apply "$1"
        if [ $? -eq 0 ]; then
            echo ""
            echo "⚠️  Important: Restart your development servers for changes to take effect:"
            echo "   1. Stop backend server (Ctrl+C in backend terminal)"
            echo "   2. Stop frontend server (Ctrl+C in frontend terminal)"
            echo "   3. Restart backend: cd backend && npm run dev"
            echo "   4. Restart frontend: npm run dev"
        fi
        ;;
esac