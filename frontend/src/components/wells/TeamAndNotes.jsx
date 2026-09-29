import React, { useState, useEffect, useCallback } from 'react';
import { Users, Mail, Phone, MapPin, ShieldCheck, MessageSquarePlus, Loader2, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getWellPersonnel, getWellNotes, addWellNote } from '../../services/wellApi';

function timeAgo(isoString) {
  if (!isoString) return '';
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const diffDays = Math.floor((Date.now() - then) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

function OfficerCard({ person }) {
  return (
    <div className="p-3 rounded-sm bg-slate-950 border border-slate-800 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-100">{person.name}</span>
        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wide">{person.designation}</div>
      <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5 truncate">
          <Mail className="w-3 h-3 shrink-0 text-slate-500" />
          <span className="truncate">{person.email}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 shrink-0 text-slate-500" />
          <span>{person.phone}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
          <span className="truncate">{person.current_posting}</span>
        </div>
      </div>
    </div>
  );
}

function CrewRow({ person }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-xs bg-slate-950/70 border border-slate-800/80 text-xs">
      <div className="min-w-0">
        <div className="text-slate-200 font-semibold truncate">{person.name}</div>
        <div className="text-[10px] font-mono text-slate-500 truncate">{person.designation}</div>
      </div>
      <div className="text-right text-[10px] font-mono text-slate-500 shrink-0">
        <div>{person.phone}</div>
        <div className="truncate max-w-[140px]">{person.current_posting}</div>
      </div>
    </div>
  );
}

export default function TeamAndNotes({ wellId }) {
  const { username } = useAuth();
  const [loading, setLoading] = useState(true);
  const [crew, setCrew] = useState([]);
  const [keyOfficers, setKeyOfficers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const load = useCallback(async () => {
    if (!wellId) return;
    setLoading(true);
    try {
      const [personnelRes, notesRes] = await Promise.all([
        getWellPersonnel(wellId),
        getWellNotes(wellId),
      ]);
      setCrew(personnelRes.crew || []);
      setKeyOfficers(personnelRes.keyOfficers || []);
      setNotes(notesRes.notes || []);
    } catch (err) {
      console.error('Failed to load team/notes:', err);
    } finally {
      setLoading(false);
    }
  }, [wellId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const note = await addWellNote(wellId, {
        author: username || 'Field Engineer',
        text,
      });
      setNotes((prev) => [note, ...prev]);
      setDraft('');
    } catch (err) {
      console.error('Failed to add note:', err);
      setSubmitError('Could not save the note -- the backend may be unreachable. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <Users className="w-3.5 h-3.5 text-blue-400" />
        <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
          Team &amp; Well Notes
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Loading team roster and notes...</span>
        </div>
      ) : (
        <>
          {/* Key Officers */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
              Key Officers (Field)
            </div>
            {keyOfficers.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono">No key-officer records on file for this well.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {keyOfficers.map((p) => (
                  <OfficerCard key={p.email} person={p} />
                ))}
              </div>
            )}
          </div>

          {/* Rig Crew */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
              Rig Crew (This Well)
            </div>
            {crew.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono">No crew records on file for this well.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {crew.map((p) => (
                  <CrewRow key={p.email} person={p} />
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquarePlus className="w-3 h-3" />
              <span>Engineer Notes</span>
            </div>

            {notes.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono">No notes yet for this well -- add the first one below.</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notes.map((note) => (
                  <div key={note.note_id} className="p-2.5 rounded-xs bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                      <span className="text-slate-300 font-semibold">{note.author}</span>
                      <span>{timeAgo(note.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddNote} className="space-y-1.5 pt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Add a note for future reference on this well, as ${username || 'Field Engineer'}...`}
                rows={2}
                maxLength={4000}
                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans resize-none"
              />
              <div className="flex items-center justify-between">
                {submitError ? (
                  <span className="text-[10px] font-mono text-red-400">{submitError}</span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={!draft.trim() || submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Add Note</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
