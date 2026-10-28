#!/usr/bin/env bash
# notify-discord.sh: posts the v<version> GitHub release with OPENCODE_RELEASE_NOTES to the Discord webhook
# (DISCORD_WEBHOOK).
. "$(dirname "$0")/lib.sh"

# Discord caps embed descriptions at 4096 characters; an empty allowed_mentions keeps notes from pinging anyone.
payload=$(jq -n --arg version "v$OPENCODE_VERSION" --arg notes "${OPENCODE_RELEASE_NOTES:-}" \
  --arg url "https://github.com/$GITHUB_REPOSITORY/releases/tag/v$OPENCODE_VERSION" '
  ("\n\n… [Full release notes](" + $url + ")") as $more |
  {
    allowed_mentions: {parse: []},
    embeds: [{
      title: $version,
      url: $url,
      description: (
        if ($notes | test("\\S") | not) then "\($version) released. [Release notes](\($url))"
        elif ($notes | length) > 4096 then $notes[:4096 - ($more | length)] + $more
        else $notes end
      )
    }]
  }')
echo "$payload" | jq .
if dry_run; then exit 0; fi

test -n "${DISCORD_WEBHOOK:-}" || die "Missing DISCORD_WEBHOOK"
printf '%s' "$payload" |
  curl -sS --fail-with-body --retry 3 -H 'Content-Type: application/json' --data-binary @- "$DISCORD_WEBHOOK"
