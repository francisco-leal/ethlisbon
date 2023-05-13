import { User } from "lucide-react";
import { Input } from "@/components/ui/input";

const UserSplitAmountCard = ({ contactName, amount }) => {
  return (
    <div className="mb-4 flex justify-between items-center pb-4 last:mb-0 last:pb-0">
      <User />
      <div className="space-y-1">
        <p contact="text-sm font-medium leading-none">{contactName}</p>
      </div>

      <Input
        value={amount + " $"}
        className="w-24"
        type="email"
        placeholder="Amount"
        onChange={e => console.log(e.target.value)}
      />
    </div>
  );
};

export default UserSplitAmountCard;
