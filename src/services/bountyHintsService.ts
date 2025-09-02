import { supabase } from "../supabaseClient";

export interface BountyHint {
  id?: string;
  bounty_id: string;
  hint: string;
  type: "tip" | "warning" | "info";
  created_at: string;
}

export class BountyHintsService {
  // Get all hints for a specific bounty
  static async getBountyHints(bountyId: string): Promise<BountyHint[]> {
    try {
      const { data, error } = await supabase
        .from("bounty_hint")
        .select("*")
        .eq("bounty_id", bountyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bounty hints:", error);
        throw error;
      }

      // Debug logging to see what data is actually returned
      console.log("DEBUG: Raw data from database:", data);
      console.log("DEBUG: First hint object:", data?.[0]);
      console.log(
        "DEBUG: Keys in first hint:",
        data?.[0] ? Object.keys(data[0]) : "No data",
      );

      return data || [];
    } catch (error) {
      console.error("Failed to fetch bounty hints:", error);
      throw error;
    }
  }

  // Add a new hint to a bounty
  static async addBountyHint(
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

      const { data, error } = await supabase
        .from("bounty_hint")
        .insert({
          bounty_id: bountyId,
          hint: hint.trim(),
          type: type,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error adding bounty hint:", error);
        throw new Error(`Failed to add hint: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create hint");
      }

      console.log("DEBUG: Added hint data:", data);
      console.log("DEBUG: Added hint keys:", Object.keys(data));

      return data;
    } catch (error) {
      console.error("Failed to add bounty hint:", error);
      throw error;
    }
  }

  // Update an existing hint
  static async updateBountyHint(
    hintId: string,
    hint: string,
    type: "tip" | "warning" | "info",
  ): Promise<BountyHint> {
    try {
      // Validate inputs
      if (!hintId) {
        throw new Error("Hint ID is required");
      }
      if (!hint.trim()) {
        throw new Error("Hint text cannot be empty");
      }

      const { data, error } = await supabase
        .from("bounty_hint")
        .update({
          hint: hint.trim(),
          type: type,
        })
        .eq("id", hintId)
        .select("*")
        .single();

      if (error) {
        console.error("Error updating bounty hint:", error);
        if (error.code === "PGRST116") {
          throw new Error("Hint not found or no permission to update");
        }
        throw new Error(`Failed to update hint: ${error.message}`);
      }

      if (!data) {
        throw new Error("Hint not found");
      }

      // Hint updated successfully
      return data;
    } catch (error) {
      console.error("Failed to update bounty hint:", error);
      throw error;
    }
  }

  // Delete a hint
  static async deleteBountyHint(hintId: string): Promise<void> {
    try {
      // Deleting hint with specified ID

      // Validate input
      if (!hintId) {
        throw new Error("Hint ID is required");
      }

      // First check if hint exists
      const { data: existingHint, error: selectError } = await supabase
        .from("bounty_hint")
        .select("id")
        .eq("id", hintId)
        .single();

      if (selectError) {
        if (selectError.code === "PGRST116") {
          throw new Error("Hint not found");
        }
        throw new Error(
          `Failed to verify hint existence: ${selectError.message}`,
        );
      }

      if (!existingHint) {
        throw new Error("Hint not found");
      }

      const { error } = await supabase
        .from("bounty_hint")
        .delete()
        .eq("id", hintId);

      if (error) {
        console.error("Error deleting bounty hint:", error);
        if (error.code === "PGRST116") {
          throw new Error("Hint not found or no permission to delete");
        }
        throw new Error(`Failed to delete hint: ${error.message}`);
      }

      // Hint deleted successfully
    } catch (error) {
      console.error("Failed to delete bounty hint:", error);
      throw error;
    }
  }

  // Get hint count for a bounty
  static async getBountyHintCount(bountyId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("bounty_hint")
        .select("*")
        .eq("bounty_id", bountyId);

      if (error) {
        console.error("Error fetching bounty hint count:", error);
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Failed to fetch bounty hint count:", error);
      throw error;
    }
  }

  // Delete all hints for a specific bounty (using bounty_id instead of hint id)
  static async deleteAllBountyHints(bountyId: string): Promise<void> {
    try {
      console.log("Deleting all hints for bountyId:", bountyId);

      // Validate input
      if (!bountyId) {
        throw new Error("Bounty ID is required");
      }

      const { error } = await supabase
        .from("bounty_hint")
        .delete()
        .eq("bounty_id", bountyId);

      if (error) {
        console.error("Error deleting bounty hints:", error);
        throw new Error(`Failed to delete hints: ${error.message}`);
      }

      console.log("All hints deleted successfully for bountyId:", bountyId);
    } catch (error) {
      console.error("Failed to delete bounty hints:", error);
      throw error;
    }
  }

  // Delete a specific hint by its position/index in the bounty (alternative approach)
  static async deleteHintByIndex(
    bountyId: string,
    hintIndex: number,
  ): Promise<void> {
    try {
      console.log(
        "Deleting hint by index:",
        hintIndex,
        "for bountyId:",
        bountyId,
      );

      // First get all hints for this bounty
      const hints = await this.getBountyHints(bountyId);

      if (!hints || hints.length === 0) {
        throw new Error("No hints found for this bounty");
      }

      if (hintIndex < 0 || hintIndex >= hints.length) {
        throw new Error("Invalid hint index");
      }

      const hintToDelete = hints[hintIndex];

      // Try to delete by ID if available, otherwise delete by content match
      if (hintToDelete.id) {
        await this.deleteBountyHint(hintToDelete.id);
      } else {
        // Delete by matching content and bounty_id (as a fallback)
        const { error } = await supabase
          .from("bounty_hint")
          .delete()
          .eq("bounty_id", bountyId)
          .eq("hint", hintToDelete.hint)
          .eq("type", hintToDelete.type);

        if (error) {
          console.error("Error deleting hint by content match:", error);
          throw new Error(`Failed to delete hint: ${error.message}`);
        }
      }

      console.log("Hint deleted successfully by index");
    } catch (error) {
      console.error("Failed to delete hint by index:", error);
      throw error;
    }
  }
}
