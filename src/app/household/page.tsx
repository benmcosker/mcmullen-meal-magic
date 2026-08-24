import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/AppShell";
import { HouseholdManager } from "@/components/HouseholdManager";
import { getHousehold, MAX_HOUSEHOLD_NAME } from "@/lib/household";
import { INVITE_TTL_DAYS, listPendingInvites } from "@/lib/invites";
import { requireHousehold } from "@/lib/session";

export default async function HouseholdPage() {
  const user = await requireHousehold();

  const [household, invites] = await Promise.all([
    getHousehold(user.householdId),
    listPendingInvites(user.id),
  ]);

  return (
    <AppShell>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Your household
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Everyone here shares one library, one weekly plan and one shopping list.
      </Typography>

      <HouseholdManager
        householdName={household?.name ?? user.householdName}
        members={
          household?.members.map((member) => ({
            id: member.id,
            name: member.name,
            email: member.email,
          })) ?? []
        }
        invites={invites.map((invite) => ({
          id: invite.id,
          code: invite.code,
          email: invite.email,
          expiresAt: invite.expiresAt.toISOString(),
          joinsFamily: invite.joinsFamily,
        }))}
        inviteDays={INVITE_TTL_DAYS}
        maxNameLength={MAX_HOUSEHOLD_NAME}
      />
    </AppShell>
  );
}
