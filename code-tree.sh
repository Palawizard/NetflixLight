#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./code-tree.sh [chemin_du_repo]
#
# Exemple:
#   ./code-tree.sh .
#
# Ce script :
# - respecte .gitignore grâce à git ls-files
# - affiche l'arborescence des fichiers de code
# - montre le nombre de lignes par fichier
# - affiche un total à la fin

ROOT="${1:-.}"
ROOT_KEY="__ROOT__"

cd "$ROOT"

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    echo "Erreur : ce script doit être lancé dans un dépôt Git pour respecter .gitignore." >&2
    exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

declare -A DIR_SEEN
declare -A DIR_CHILDREN
declare -A FILE_LINES

TOTAL_LOC=0
TOTAL_FILES=0

is_code_file() {
    local f="$1"
    local base="${f##*/}"

    case "$base" in
        Makefile|Dockerfile|Containerfile|Jenkinsfile|Procfile|CMakeLists.txt|meson.build|Vagrantfile|Gemfile|Rakefile|Justfile|Brewfile)
            return 0
            ;;
    esac

    case "$f" in
        *.sh|*.bash|*.zsh|*.fish|\
        *.py|\
        *.js|*.jsx|*.mjs|*.cjs|\
        *.ts|*.tsx|\
        *.java|*.kt|*.kts|\
        *.go|\
        *.rs|\
        *.c|*.h|*.cpp|*.cc|*.cxx|*.hpp|*.hh|*.hxx|\
        *.cs|\
        *.php|\
        *.rb|\
        *.swift|\
        *.scala|\
        *.lua|\
        *.pl|*.pm|\
        *.r|\
        *.sql|\
        *.html|*.htm|\
        *.css|*.scss|*.sass|*.less|\
        *.xml|\
        *.json|*.jsonc|\
        *.yaml|*.yml|\
        *.toml|\
        *.ini|*.cfg|*.conf|\
        *.vue|\
        *.svelte|\
        *.qml|\
        *.gradle|\
        *.properties|\
        *.tf|*.tfvars)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

add_child_once() {
    local parent="$1"
    local entry="$2"
    local current="${DIR_CHILDREN[$parent]-}"

    if [[ -z "$current" ]]; then
        DIR_CHILDREN["$parent"]="$entry"
        return
    fi

    if ! grep -Fqx -- "$entry" <<< "$current"; then
        DIR_CHILDREN["$parent"]+=$'\n'"$entry"
    fi
}

DIR_SEEN["$ROOT_KEY"]="1"

while IFS= read -r -d '' file; do
    [[ -f "$file" ]] || continue
    is_code_file "$file" || continue

    lines="$(wc -l < "$file")"
    lines="${lines//[[:space:]]/}"

    FILE_LINES["$file"]="$lines"
    TOTAL_LOC=$((TOTAL_LOC + lines))
    TOTAL_FILES=$((TOTAL_FILES + 1))

    IFS='/' read -r -a parts <<< "$file"

    parent="$ROOT_KEY"
    current=""

    if ((${#parts[@]} > 1)); then
        for ((i = 0; i < ${#parts[@]} - 1; i++)); do
            part="${parts[$i]}"

            if [[ -z "$current" ]]; then
                current="$part"
            else
                current="$current/$part"
            fi

            if [[ -z "${DIR_SEEN[$current]+x}" ]]; then
                DIR_SEEN["$current"]="1"
                add_child_once "$parent" "D:$current"
            fi

            parent="$current"
        done
    fi

    if [[ "$file" == */* ]]; then
        parent="${file%/*}"
    else
        parent="$ROOT_KEY"
    fi

    add_child_once "$parent" "F:$file"
done < <(git ls-files -z --cached --others --exclude-standard)

print_tree() {
    local parent="$1"
    local prefix="$2"

    local entries="${DIR_CHILDREN[$parent]-}"
    [[ -n "$entries" ]] || return 0

    mapfile -t dirs < <(printf '%s\n' "$entries" | awk -F: '$1=="D"{print $2}' | sort -V)
    mapfile -t files < <(printf '%s\n' "$entries" | awk -F: '$1=="F"{print $2}' | sort -V)

    local items=()

    for d in "${dirs[@]}"; do
        [[ -n "$d" ]] && items+=("D:$d")
    done

    for f in "${files[@]}"; do
        [[ -n "$f" ]] && items+=("F:$f")
    done

    local count="${#items[@]}"
    local i=0

    for item in "${items[@]}"; do
        i=$((i + 1))

        local kind="${item%%:*}"
        local path="${item#*:}"
        local connector="├──"
        local next_prefix="${prefix}│   "

        if [[ $i -eq $count ]]; then
            connector="└──"
            next_prefix="${prefix}    "
        fi

        if [[ "$kind" == "D" ]]; then
            local name="${path##*/}"
            echo "${prefix}${connector} ${name}/"
            print_tree "$path" "$next_prefix"
        else
            local name="${path##*/}"
            local lines="${FILE_LINES[$path]}"
            echo "${prefix}${connector} ${name} (${lines} lignes)"
        fi
    done
}

REPO_NAME="$(basename "$REPO_ROOT")"

echo "${REPO_NAME}/"
print_tree "$ROOT_KEY" ""

echo
echo "Total fichiers: ${TOTAL_FILES}"
echo "Total lignes  : ${TOTAL_LOC}"
