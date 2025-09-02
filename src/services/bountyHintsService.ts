import { supabase } from "../supabaseClient";

export interface BountyHint {
  bounty_id: string;
  hint: string;
  type: "tip" | "warning" | "info";
  created_at: string;
}

export class BountyHintsService {
  // Get hint for a specific bounty (one bounty = one hint)
  static async getBountyHint(bountyId: string): Promise<BountyHint | null> {
    try {
      const { data, error } = await supabase
        .from("bounty_hint")
        .select("*")
        .eq("bounty_id", bountyId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No hint found - this is normal
          return null;
        }
        console.error("Error fetching bounty hint:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch bounty hint:", error);
      throw error;
    }
  }

  // Add or update hint for a bounty (upsert operation)
  static async saveOrUpdateBountyHint(
    bountyId: string,
    hint: string,
    type: "tip" | "warning" | "info" = "tip",
  ): Promise<BountyHint> {
    try {
      // Validate inputs
      if (!bountyId) {
        throw new Error("Bounty ID is required");
      }
      if (!hint.trim()) {
        throw new Error("Hint text cannot be empty");
      }
      if (!["tip", "warning", "info"].includes(type)) {
        throw new Error("Invalid hint type");
      }

      // Use upsert to either insert or update
      const { data, error } = await supabase
        .from("bounty_hint")
        .upsert(
          {
            bounty_id: bountyId,
            hint: hint.trim(),
            type: type,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: "bounty_id",
          },
        )
        .select("*")
        .single();

      if (error) {
        console.error("Error saving bounty hint:", error);
        throw new Error(`Failed to save hint: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to save hint");
      }

      return data;
    } catch (error) {
      console.error("Failed to save bounty hint:", error);
      throw error;
    }
  }

  // Delete hint for a bounty
  static async deleteBountyHint(bountyId: string): Promise<void> {
    try {
      // Validate input
      if (!bountyId) {
        throw new Error("Bounty ID is required");
      }

      const { error } = await supabase
        .from("bounty_hint")
        .delete()
        .eq("bounty_id", bountyId);

      if (error) {
        console.error("Error deleting bounty hint:", error);
        throw new Error(`Failed to delete hint: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to delete bounty hint:", error);
      throw error;
    }
  }

  // Check if bounty has a hint
  static async bountyHasHint(bountyId: string): Promise<boolean> {
    try {
      const hint = await this.getBountyHint(bountyId);
      return hint !== null;
    } catch (error) {
      console.error("Failed to check if bounty has hint:", error);
      return false;
    }
  }
}
