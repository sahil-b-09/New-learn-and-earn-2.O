
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, User, X, Ban, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserData {
  id: string;
  email: string;
  name: string;
  joined_at: string;
  is_admin: boolean;
  is_suspended?: boolean;
  last_login?: string;
  courses_purchased?: number;
  successful_referrals?: number;
  total_earned?: number;
  activity_score?: number;
  engagement_level?: 'low' | 'medium' | 'high';
}

interface UserTableProps {
  users: UserData[];
  onMakeAdmin: (user: UserData) => void;
  onRemoveAdmin: (user: UserData) => void;
  onGrantCourseAccess: (userId: string) => void;
  onSuspendUser: (user: UserData) => void;
  onUnsuspendUser: (user: UserData) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onMakeAdmin,
  onRemoveAdmin,
  onGrantCourseAccess,
  onSuspendUser,
  onUnsuspendUser
}) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No users found
      </div>
    );
  }
  
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead>Courses</TableHead>
            <TableHead>Referrals</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name || 'Unnamed User'}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {user.is_admin ? (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100">
                      User
                    </Badge>
                  )}
                  {user.is_suspended && (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                      Suspended
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-gray-500 text-sm">
                {user.joined_at && formatDistanceToNow(new Date(user.joined_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-gray-500 text-sm">
                {user.last_login 
                  ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                  : 'Never'}
              </TableCell>
              <TableCell>{user.courses_purchased || 0}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{user.successful_referrals || 0}</span>
                  {user.total_earned ? (
                    <span className="text-xs text-green-600">₹{user.total_earned} earned</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    
                    {user.is_admin ? (
                      <DropdownMenuItem 
                        onClick={() => onRemoveAdmin(user)}
                        className="text-red-600"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove Admin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => onMakeAdmin(user)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      onClick={() => onGrantCourseAccess(user.id)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Grant Course Access
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {user.is_suspended ? (
                      <DropdownMenuItem
                        onClick={() => onUnsuspendUser(user)}
                        className="text-green-600"
                        data-testid={`button-unsuspend-${user.id}`}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Unsuspend User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onSuspendUser(user)}
                        className="text-red-600"
                        data-testid={`button-suspend-${user.id}`}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Suspend User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
