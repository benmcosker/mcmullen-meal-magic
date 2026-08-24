"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState, useTransition, type FormEvent } from "react";

import {
  createInviteAction,
  renameHouseholdAction,
  revokeInviteAction,
  type CreatedInvite,
  type InviteKind,
} from "@/app/household/actions";

export type MemberView = { id: string; name: string; email: string };
export type InviteView = {
  id: string;
  code: string;
  email: string | null;
  expiresAt: string;
  joinsFamily: boolean;
};

/**
 * What each kind of invitation actually does, in the words someone deciding
 * between them needs.
 *
 * Spelled out on the page rather than left to the label, because the two are
 * not variations on a theme: one hands over the whole library and this week's
 * plan, and the other hands over nothing at all. Getting it wrong in the
 * generous direction cannot be undone by deleting a code.
 */
const KIND_COPY: Record<InviteKind, { label: string; detail: string }> = {
  family: {
    label: "To the family",
    detail:
      "They join this household. Same recipes, same weekly plan, same shopping list, and they can change all of it.",
  },
  outside: {
    label: "Outside the family",
    detail:
      "They get a household of their own, starting empty. Nothing is shared in either direction - they will not see your recipes and you will not see theirs.",
  },
};

export function HouseholdManager({
  householdName,
  members,
  invites,
  inviteDays,
  maxNameLength,
}: {
  householdName: string;
  members: MemberView[];
  invites: InviteView[];
  inviteDays: number;
  maxNameLength: number;
}) {
  return (
    <Stack spacing={3}>
      <HouseholdName current={householdName} maxLength={maxNameLength} />
      <Members members={members} householdName={householdName} />
      <InviteForm inviteDays={inviteDays} />
      {invites.length > 0 ? <PendingInvites invites={invites} /> : null}
    </Stack>
  );
}

function HouseholdName({
  current,
  maxLength,
}: {
  current: string;
  maxLength: number;
}) {
  const [draft, setDraft] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const changed = draft.trim() !== current;

  function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await renameHouseholdAction(draft);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card>
      <CardContent component="form" onSubmit={save}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Household
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            slotProps={{ htmlInput: { maxLength } }}
            fullWidth
            size="small"
          />
          <Button
            type="submit"
            variant="outlined"
            disabled={!changed || pending}
          >
            Save
          </Button>
        </Stack>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Members({
  members,
  householdName,
}: {
  members: MemberView[];
  householdName: string;
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h2" sx={{ mb: 0.5 }}>
          Who is in {householdName}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {members.length === 1
            ? "Just you, for now."
            : `${members.length} people share this library and plan.`}
        </Typography>

        <Stack divider={<Divider />}>
          {members.map((member) => (
            <Box key={member.id} sx={{ py: 1.25 }}>
              <Typography>{member.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {member.email}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function InviteForm({ inviteDays }: { inviteDays: number }) {
  const [kind, setKind] = useState<InviteKind>("family");
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreated(null);

    startTransition(async () => {
      const result = await createInviteAction(kind, email);
      if (result.ok) {
        setCreated(result.invite);
        setEmail("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent component="form" onSubmit={send}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Invite someone
        </Typography>

        <ToggleButtonGroup
          exclusive
          value={kind}
          onChange={(_, next: InviteKind | null) => next && setKind(next)}
          size="small"
          sx={{ mb: 1.5 }}
        >
          {(Object.keys(KIND_COPY) as InviteKind[]).map((value) => (
            <ToggleButton key={value} value={value}>
              {KIND_COPY[value].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {KIND_COPY[kind].detail}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Their email (optional)"
            placeholder="Pins the code to one address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            fullWidth
            size="small"
          />
          <Button type="submit" variant="contained" disabled={pending}>
            Create code
          </Button>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}

        {created ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {created.kind === "family"
                ? "This code joins your household."
                : "This code starts a household of their own."}{" "}
              It works once, and expires in {inviteDays} days.
            </Typography>
            <Typography
              sx={{
                fontFamily: "monospace",
                fontSize: "1.25rem",
                letterSpacing: 1,
              }}
            >
              {created.code}
            </Typography>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PendingInvites({ invites }: { invites: InviteView[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent>
        <Typography variant="h2" sx={{ mb: 0.5 }}>
          Codes waiting to be used
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Each works once. Withdraw one if it went to the wrong person.
        </Typography>

        <Stack divider={<Divider />}>
          {invites.map((invite) => (
            <Stack
              key={invite.id}
              direction="row"
              sx={{ py: 1.25, alignItems: "center", gap: 1.5 }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontFamily: "monospace" }}>
                  {invite.code}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {invite.email ?? "Anyone with the code"}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={invite.joinsFamily ? "Family" : "Outside"}
                color={invite.joinsFamily ? "primary" : "default"}
                variant={invite.joinsFamily ? "filled" : "outlined"}
              />
              <Button
                size="small"
                color="inherit"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await revokeInviteAction(invite.id);
                  })
                }
              >
                Withdraw
              </Button>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
