import { Role } from '@xo/shared';

export const APPROVE_ROLES: ReadonlySet<Role> = new Set([
  Role.SUPER_ADMIN,
  Role.PROJECT_MANAGER,
  Role.SUPERINTENDENT,
  Role.OWNER_REP,
]);

export const AMEND_ROLES: ReadonlySet<Role> = new Set([
  Role.SUPER_ADMIN,
  Role.PROJECT_MANAGER,
  Role.SUPERINTENDENT,
]);

export interface StatusAction {
  key: 'submit' | 'approve' | 'amend';
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  confirmButtonText: string;
  variant: 'primary' | 'secondary' | 'danger';
}

export function getStatusAction(
  logStatus: string,
  userRole: Role | undefined,
): StatusAction | null {
  switch (logStatus) {
    case 'DRAFT':
    case 'AMENDED':
      return {
        key: 'submit',
        label: 'Submit for Review',
        confirmTitle: 'Submit Daily Log?',
        confirmMessage:
          'This will submit the daily log for review. You will not be able to edit it until it is amended.',
        confirmButtonText: 'Submit',
        variant: 'primary',
      };

    case 'PENDING_REVIEW':
      if (!userRole || !APPROVE_ROLES.has(userRole)) return null;
      return {
        key: 'approve',
        label: 'Approve',
        confirmTitle: 'Approve Daily Log?',
        confirmMessage: 'This will mark the daily log as approved.',
        confirmButtonText: 'Approve',
        variant: 'primary',
      };

    case 'APPROVED':
      if (!userRole || !AMEND_ROLES.has(userRole)) return null;
      return {
        key: 'amend',
        label: 'Request Amendment',
        confirmTitle: 'Request Amendment?',
        confirmMessage:
          'This will reopen the daily log for amendments. It will need to be re-submitted and re-approved afterward.',
        confirmButtonText: 'Amend',
        variant: 'secondary',
      };

    default:
      return null;
  }
}
