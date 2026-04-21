import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Tag, 
  User as UserIcon,
  Filter,
  Database,
  FileText,
  StickyNote,
  Settings,
  Globe
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { useData } from '../contexts/DataContext';

export default function Repository() {
  const { user, profile, refreshProfile } = useAuth();
  const { links, loading, refreshLinks } = useData();
  const [activeTab, setActiveTab] = useState('knowledge');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '', category: 'Other', note: '', tags: '' });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDocSettingsOpen, setIsDocSettingsOpen] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState(profile?.google_doc_url || '');

  // Handle Google Auth Message
  useEffect(() => {
    const handleGoogleMessage = async (event: MessageEvent) => {
      // In AI Studio, origin might be different due to proxying, so we scan for the specific payload
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        console.log('Auth: Received GOOGLE_AUTH_SUCCESS payload from popup');
        
        // The server handles the DB update via 'state' param now
        // We just need to refresh the UI
        if (user) {
          console.log('Auth: Success! Triggering profile sync in 1000ms...');
          // Give the server a moment to ensure the DB write is committed
          setTimeout(async () => {
             try {
               await refreshProfile();
               console.log('Auth: Profile sync complete');
               toast.success('Google account connected successfully');
             } catch (syncErr) {
               console.error('Auth: Manual sync failed after connection:', syncErr);
               toast.error('Connection successful but sync delayed. Please refresh the page.');
             }
          }, 1000);
        } else {
          console.error('Auth: Success received but user context is missing');
        }
      }
    };
    window.addEventListener('message', handleGoogleMessage);
    console.log('Auth: Google message listener attached');
    return () => {
      window.removeEventListener('message', handleGoogleMessage);
      console.log('Auth: Google message listener detached');
    };
  }, [user?.id, refreshProfile]); // Only depend on ID and memoized refresh

  useEffect(() => {
    if (profile?.google_doc_url) {
      setGoogleDocUrl(profile.google_doc_url);
    }
  }, [profile]);

  async function handleConnectGoogle() {
    if (!user) return;
    try {
      const resp = await fetch(`/api/auth/google/url?uid=${user.id}`);
      const { url } = await resp.json();
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      window.open(url, 'google_auth', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (err) {
      toast.error('Failed to initiate Google connection');
    }
  }

  async function handleDisconnectGoogle() {
    if (!user) return;
    const confirmDisconnect = window.confirm('Are you sure you want to disconnect your Google account? You will still be able to see your Google Doc URL, but the app connection will be removed.');
    if (!confirmDisconnect) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          google_connected: false,
          google_refresh_token: null 
        })
        .eq('id', user.id);
      
      if (error) throw error;
      await refreshProfile();
      toast.success('Google account disconnected');
    } catch (err: any) {
      toast.error('Failed to disconnect');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDocUrl() {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ google_doc_url: googleDocUrl })
        .eq('id', user.id);
      
      if (error) throw error;
      await refreshProfile();
      toast.success('Google Doc URL saved');
      setIsDocSettingsOpen(false);
    } catch (err: any) {
      toast.error('Failed to save URL');
    } finally {
      setSubmitting(false);
    }
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    // Return the URL as is if it's already an edit link, or ensure it ends with /edit
    // Removing rm=minimal and chrome=false as they hide the toolbar
    if (url.includes('docs.google.com/document/d/')) {
      if (url.includes('/edit')) return url;
      const baseUrl = url.split('/edit')[0].split('?')[0].replace(/\/$/, '');
      return `${baseUrl}/edit`;
    }
    return url;
  };

  const CATEGORIES = ['Youtube', 'Github', 'Docs', 'News', 'Other'];

  async function handleAddLink() {
    if (!user) return;
    if (!newLink.title || !newLink.url) {
      toast.error('Title and URL are required');
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = newLink.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('repository_links')
        .insert({
          user_id: user.id,
          title: newLink.title,
          url: newLink.url,
          category: newLink.category,
          note: newLink.note,
          tags: tagsArray
        });

      if (error) throw error;
      
      toast.success('Link added to repository');
      setIsAddOpen(false);
      setNewLink({ title: '', url: '', note: '', tags: '' });
      refreshLinks();
    } catch (error: any) {
      toast.error(`Failed to add link: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateLink() {
    if (!user || !editingLink) return;
    
    setSubmitting(true);
    try {
      const tagsArray = typeof editingLink.tags === 'string' 
        ? editingLink.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : editingLink.tags;

      const { error } = await supabase
        .from('repository_links')
        .update({
          title: editingLink.title,
          url: editingLink.url,
          category: editingLink.category,
          note: editingLink.note,
          tags: tagsArray
        })
        .eq('id', editingLink.id)
        .eq('user_id', user.id); // Guard with user ID

      if (error) throw error;
      
      toast.success('Link updated');
      setIsEditOpen(false);
      setEditingLink(null);
      refreshLinks();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      // Explicitly check for user_id in the query to bypass RLS issues if auth.uid() isn't synced
      const { error } = await supabase
        .from('repository_links')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Link deleted');
      refreshLinks();
    } catch (error: any) {
      toast.error(`Delete failed: ${error.message}`);
    }
  }

  const openEditDialog = (link: any) => {
    setEditingLink({
      ...link,
      tags: link.tags ? link.tags.join(', ') : ''
    });
    setIsEditOpen(true);
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = 
      link.title.toLowerCase().includes(search.toLowerCase()) ||
      link.url.toLowerCase().includes(search.toLowerCase()) ||
      link.note?.toLowerCase().includes(search.toLowerCase()) ||
      link.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = filterCategory === 'All' || link.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase whitespace-nowrap">Repository</h1>
          <p className="text-xl font-medium text-muted-foreground hidden sm:block">Knowledge Module</p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'knowledge' && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger render={<Button size="sm" className="font-bold uppercase tracking-widest text-[11px] px-6" />}>
                <Plus className="h-3 w-3 mr-2" />
                Add Link
              </DialogTrigger>
              <DialogContent className="bg-card border-border sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase tracking-tight">Add New Resource</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
                    <Input 
                      placeholder="e.g. TradingView Strategy" 
                      value={newLink.title}
                      onChange={e => setNewLink({...newLink, title: e.target.value})}
                      className="bg-background/20 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                    <Select value={newLink.category} onValueChange={v => setNewLink({...newLink, category: v})}>
                      <SelectTrigger className="bg-background/20 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL</label>
                    <Input 
                      placeholder="https://..." 
                      value={newLink.url}
                      onChange={e => setNewLink({...newLink, url: e.target.value})}
                      className="bg-background/20 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Note (Optional)</label>
                    <Textarea 
                      placeholder="What is this link about?" 
                      value={newLink.note}
                      onChange={e => setNewLink({...newLink, note: e.target.value})}
                      className="bg-background/20 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags (Comma separated)</label>
                    <Input 
                      placeholder="trading, strategy, tools" 
                      value={newLink.tags}
                      onChange={e => setNewLink({...newLink, tags: e.target.value})}
                      className="bg-background/20 border-border/50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="text-[10px] uppercase font-bold tracking-widest">Cancel</Button>
                  <Button onClick={handleAddLink} disabled={submitting} className="font-bold uppercase tracking-widest text-[11px]">
                    {submitting ? 'Adding...' : 'Add to Repo'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {activeTab === 'notes' && (
            <Dialog open={isDocSettingsOpen} onOpenChange={setIsDocSettingsOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="font-bold uppercase tracking-widest text-[11px] px-6 border-primary/20" />}>
                <Settings className="h-3 w-3 mr-2" />
                Notes Config
              </DialogTrigger>
              <DialogContent className="bg-card border-border sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase tracking-tight">Google Doc Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                       <h4 className="text-xs font-black uppercase text-primary mb-2">Step 1: Auth</h4>
                       <p className="text-[10px] text-muted-foreground mb-4">Connect your Google account once to enable collaborative features.</p>
                       <div className="flex flex-col gap-2">
                         {profile?.google_connected ? (
                           <div className="space-y-4">
                             <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                 <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Database Sync Active</span>
                               </div>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-7 text-[9px] uppercase font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
                                 onClick={handleDisconnectGoogle}
                                 disabled={submitting}
                               >
                                 Disconnect
                               </Button>
                             </div>
                             <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                               Your account is linked at the database level. This connection persists across all your devices until you explicitly disconnect.
                             </p>
                           </div>
                         ) : (
                           <Button 
                             variant="default"
                             className="w-full text-xs font-bold h-11"
                             onClick={handleConnectGoogle}
                             disabled={submitting}
                           >
                             {submitting ? 'Connecting...' : 'Connect Google Account'}
                           </Button>
                         )}
                       </div>
                       <div className="mt-3 p-2 bg-black/40 rounded border border-white/5 text-[9px] font-mono text-muted-foreground break-all">
                          <span className="text-primary font-bold">REDIRECT_URI:</span><br/>
                          {typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/google/callback
                       </div>
                    </div>

                    <div className="p-4 rounded-xl bg-background/20 border border-border/50">
                       <h4 className="text-xs font-black uppercase mb-2">Step 2: Personal Doc Link</h4>
                       <p className="text-[10px] text-muted-foreground mb-3">Paste the full URL of your private Trading Notes Google Doc.</p>
                       <Input 
                         placeholder="https://docs.google.com/document/d/..." 
                         value={googleDocUrl}
                         onChange={e => setGoogleDocUrl(e.target.value)}
                         className="mb-4"
                       />
                       <div className="flex items-center gap-2 text-[9px] text-muted-foreground italic bg-muted/30 p-2 rounded">
                          <Globe className="h-3 w-3 flex-none" />
                          <span>Tip: Make sure the document allows access to your logged-in Google account.</span>
                       </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDocSettingsOpen(false)} className="text-[10px] uppercase font-bold tracking-widest">Close</Button>
                  <Button onClick={handleSaveDocUrl} disabled={submitting} className="font-bold uppercase tracking-widest text-[11px]">
                    {submitting ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/30 p-1 mb-8 border border-border/50">
          <TabsTrigger value="knowledge" className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
            <Database className="h-3 w-3" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="notes" className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
            <StickyNote className="h-3 w-3" />
            Trading Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-10 bg-card/50 border-border/50 h-11 font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-2 bg-card/50 border border-border/50 rounded-md h-11 min-w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground ml-2" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="border-0 bg-transparent focus:ring-0 text-xs font-bold uppercase tracking-widest">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 rounded-2xl bg-muted/20 animate-pulse border border-border/30" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLinks.map((link) => (
                <Card key={link.id} className="group hover:border-primary/50 transition-all duration-300 flex flex-col bg-card/30 backdrop-blur-sm border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 truncate">
                        <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">
                          {link.title}
                        </CardTitle>
                        <Badge variant="outline" className="w-fit text-[8px] font-black uppercase bg-primary/5 text-primary border-primary/20">
                          {link.category || 'Other'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" render={
                          <a href={link.url} target="_blank" rel="noopener noreferrer" title="Open Link" />
                        }>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {user?.id === link.user_id && (
                          <div className="flex items-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => openEditDialog(link)}
                              title="Edit Link"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(link.id)}
                              title="Delete Link"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-xs font-mono truncate text-muted-foreground/70">
                      {link.url}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 flex-1">
                    {link.note && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed font-medium">
                        {link.note}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {link.tags?.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-background/40 hover:bg-background/60 text-[9px] font-bold uppercase tracking-widest px-2 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 text-[10px] font-mono text-muted-foreground/50 border-t border-border/10 mt-auto flex justify-between items-center h-10">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {link.users?.name || 'Trader'}
                    </div>
                    <div>{format(new Date(link.created_at), 'MMM d, yyyy')}</div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredLinks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-card/20 rounded-3xl border border-dashed border-border/50">
              <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-bold uppercase tracking-tight">No resources found</h3>
              <p className="text-muted-foreground mt-2 text-sm">Expand your search criteria or add a new link to the lab.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {profile?.google_doc_url ? (
            <div className="w-full h-[1200px] rounded-2xl overflow-hidden border border-border/50 bg-card/30 relative shadow-2xl">
               <iframe 
                 src={getEmbedUrl(profile.google_doc_url)} 
                 className="w-full h-full border-0 bg-white"
                 title="Trading Notes"
                 referrerPolicy="no-referrer"
                 allow="clipboard-read; clipboard-write; camera; microphone"
               />
               <div className="absolute top-4 right-12 flex items-center gap-2">
                  <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white" render={
                    <a href={profile.google_doc_url} target="_blank" rel="noopener noreferrer" />
                  }>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
               </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 space-y-6 bg-card/20 rounded-3xl border border-dashed border-border/50">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                 <FileText className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Trading Notes Engine</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  Embed your personal Google Doc directly into the TradeX environment for real-time journaling, screenshot attachments, and collaborative reviews.
                </p>
              </div>
              <Button onClick={() => setIsDocSettingsOpen(true)} className="font-bold uppercase tracking-widest px-8 h-12">
                Configure Notes Link
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">Edit Resource</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
              <Input 
                value={editingLink?.title || ''}
                onChange={e => setEditingLink({...editingLink, title: e.target.value})}
                className="bg-background/20 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
              <Select value={editingLink?.category || 'Other'} onValueChange={v => setEditingLink({...editingLink, category: v})}>
                <SelectTrigger className="bg-background/20 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL</label>
              <Input 
                value={editingLink?.url || ''}
                onChange={e => setEditingLink({...editingLink, url: e.target.value})}
                className="bg-background/20 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Note (Optional)</label>
              <Textarea 
                value={editingLink?.note || ''}
                onChange={e => setEditingLink({...editingLink, note: e.target.value})}
                className="bg-background/20 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags (Comma separated)</label>
              <Input 
                value={editingLink?.tags || ''}
                onChange={e => setEditingLink({...editingLink, tags: e.target.value})}
                className="bg-background/20 border-border/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="text-[10px] uppercase font-bold tracking-widest">Cancel</Button>
            <Button onClick={handleUpdateLink} disabled={submitting} className="font-bold uppercase tracking-widest text-[11px]">
              {submitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
