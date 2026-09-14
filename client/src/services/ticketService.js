import { supabase } from "../supabaseClient";
import { createTicketNo } from "../utils/ticketUtils";

export const TICKET_BUCKET = "ticket-attachments";

const safeFileName = (name = "image") =>
    name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .slice(-90);

export async function uploadTicketFiles(files, ticketNo) {
    const urls = [];

    for (const file of files) {
        const path = `${ticketNo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`;
        const { error } = await supabase.storage
            .from(TICKET_BUCKET)
            .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

        if (error) throw error;

        const { data } = supabase.storage.from(TICKET_BUCKET).getPublicUrl(path);
        urls.push(data.publicUrl);
    }

    return urls;
}

export async function createTicket({ form, files, screenPath, screenTitle }) {
    const ticketNo = createTicketNo();
    const username = localStorage.getItem("username") || "bilinmiyor";
    const displayName = localStorage.getItem("ad") || username;
    const screenshotUrls = files?.length ? await uploadTicketFiles(files, ticketNo) : [];

    const payload = {
        ticket_no: ticketNo,
        title: form.title.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
        status: "new",
        created_by_username: username,
        created_by_name: displayName,
        screen_path: screenPath || null,
        screen_title: screenTitle || null,
        screenshot_urls: screenshotUrls,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("support_tickets")
        .insert([payload])
        .select("*")
        .single();

    if (error) throw error;
    window.dispatchEvent(new CustomEvent("ticket:changed", { detail: data }));
    return data;
}

export async function fetchMyTickets(username, limit = 12) {
    const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("created_by_username", username)
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

export async function fetchAdminTickets() {
    const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function fetchNewTicketCount() {
    const { count, error } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
    if (error) throw error;
    return count || 0;
}

export async function updateTicketAdmin(id, patch) {
    const adminName = localStorage.getItem("ad") || localStorage.getItem("username") || "Admin";
    const { data, error } = await supabase
        .from("support_tickets")
        .update({
            ...patch,
            assigned_admin: adminName,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
    if (error) throw error;
    window.dispatchEvent(new CustomEvent("ticket:changed", { detail: data }));
    return data;
}
