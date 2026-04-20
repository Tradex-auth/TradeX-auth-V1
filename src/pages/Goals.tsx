import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { format, differenceInDays, parseISO } from 'date-fns';
import { 
  Plus, 
  Target, 
  Calendar as CalendarIcon, 
  Flag, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Brain,
  ChevronRight,
  AlertTriangle,
  Pin
} from 'lucide-react';
import { supabase, Goal, Milestone } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";

import { useData } from '../contexts/DataContext';

const CATEGORIES = ['trading', 'health', 'learning', 'finance', 'other'];

export default function Goals() {
  const { user } = useAuth();
  const { goals, milestones, loading, refreshGoals, refreshMilestones } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isAiBreakingDown, setIsAiBreakingDown] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'trading' as any,
    target_date: format(new Date(), 'yyyy-MM-dd')
  });

  async function handleAddGoal() {
    if (!formData.title || !user) return;
    try {
      if (editingGoal) {
        const { data: updatedGoal, error } = await supabase
          .from('goals')
          .update({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            target_date: formData.target_date
          })
          .eq('id', editingGoal.id)
          .select()
          .single();
        
        if (error) throw error;
        toast.success('Goal updated');
      } else {
        const { error } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            target_date: formData.target_date
          });
        
        if (error) throw error;
        toast.success('Goal created');
      }
      
      setIsDialogOpen(false);
      setEditingGoal(null);
      setFormData({ title: '', description: '', category: 'trading', target_date: format(new Date(), 'yyyy-MM-dd') });
      refreshGoals();
    } catch (err) {
      toast.error(editingGoal ? 'Failed to update goal' : 'Failed to create goal');
    }
  }

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      category: goal.category as any,
      target_date: goal.target_date
    });
    setIsDialogOpen(true);
  };

  async function handleToggleMilestone(id: string, completed: boolean) {
    try {
      const { error } = await supabase
        .from('milestones')
        .update({ completed: !completed })
        .eq('id', id);
      if (error) throw error;
      refreshMilestones();
    } catch (err) {
      toast.error('Update failed');
    }
  }

  async function handleAddMilestone(goalId: string, title: string) {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .insert({ goal_id: goalId, title, completed: false })
        .select()
        .single();
      if (error) throw error;
      refreshMilestones();
    } catch (err) {
      toast.error('Failed to add milestone');
    }
  }

  async function handleAiBreakdown(goal: Goal) {
    if (!process.env.GEMINI_API_KEY) return;
    setIsAiBreakingDown(goal.id);
    toast.info(`Gemini is planning milestones for: ${goal.title}`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Break this high-level goal into a list of 5-7 specific, actionable weekly milestones:
        Goal: ${goal.title}
        Description: ${goal.description}
        Target Date: ${goal.target_date}
        
        Return ONLY the milestone titles, one per line. No numbers, no extra text.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const lines = result.text?.split('\n').filter(l => l.trim().length > 0) || [];
      
      const newMilestones = lines.map(line => ({
        goal_id: goal.id,
        title: line.trim(),
        completed: false
      }));

      const { data, error } = await supabase
        .from('milestones')
        .insert(newMilestones)
        .select();

      if (error) throw error;
      refreshMilestones();
      toast.success('Milestones generated!');
    } catch (err) {
      toast.error('AI breakdown failed');
    } finally {
      setIsAiBreakingDown(null);
    }
  }

  async function handleDeleteGoal(id: string, isPinned?: boolean) {
    if (isPinned) {
      toast.error('The ultimate goal cannot be deleted.');
      return;
    }
    if (!confirm('Delete this goal and all milestones?')) return;
    try {
      await supabase.from('goals').delete().eq('id', id);
      refreshGoals();
      refreshMilestones();
      toast.success('Goal removed');
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Goal Tracker
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Map out your milestones and track your progress to 2026.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="font-bold uppercase tracking-widest gap-2" />}>
            <Plus className="h-4 w-4" />
            New Goal
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="uppercase font-black">{editingGoal ? 'Update Objective' : 'Set New Objective'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="E.g. Full-time Trading Readiness" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="What exactly does success look like?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c} className="uppercase font-bold text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input type="date" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddGoal} className="font-bold">{editingGoal ? 'Save Changes' : 'Initialize Goal'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const goalMilestones = milestones.filter(m => m.goal_id === goal.id);
          const completedCount = goalMilestones.filter(m => m.completed).length;
          const progress = goalMilestones.length > 0 ? (completedCount / goalMilestones.length) * 100 : 0;
          const daysLeft = differenceInDays(parseISO(goal.target_date), new Date());
          const isOverdue = daysLeft < 0 && progress < 100;

          return (
            <Card key={goal.id} className={`bg-card/50 flex flex-col group ${goal.is_pinned ? 'border-primary shadow-lg shadow-primary/5 md:col-span-2 lg:col-span-3' : 'border-border/50'}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] uppercase font-black bg-muted/50">{goal.category}</Badge>
                      {goal.is_pinned && <Badge className="bg-primary text-white text-[9px] font-black uppercase tracking-widest gap-1"><Pin className="h-3 w-3" /> Pinned</Badge>}
                      {isOverdue && <Badge variant="destructive" className="text-[9px] font-black uppercase flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>}
                    </div>
                    <CardTitle className={`font-black tracking-tight ${goal.is_pinned ? 'text-3xl' : 'text-xl'}`}>{goal.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black leading-none">{daysLeft > 0 ? daysLeft : 0}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Days Left</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                <div className="space-y-2">
                   <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-primary">{completedCount}/{goalMilestones.length} Milestones</span>
                      <span>{progress.toFixed(0)}%</span>
                   </div>
                   <Progress value={progress} className="h-2 bg-muted" />
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center mb-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Milestones</Label>
                      <Button variant="ghost" size="sm" onClick={() => handleAiBreakdown(goal)} disabled={isAiBreakingDown === goal.id} className="h-6 text-[9px] font-black uppercase tracking-widest text-primary gap-1">
                        {isAiBreakingDown === goal.id ? 'Breaking down...' : <>AI Breakdown <Brain className="h-3 w-3" /></>}
                      </Button>
                   </div>
                   <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                      {goalMilestones.map(m => (
                         <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
                            <Checkbox checked={m.completed} onCheckedChange={() => handleToggleMilestone(m.id, m.completed)} />
                            <span className={`text-xs font-medium ${m.completed ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                         </div>
                      ))}
                      <div className="pt-2">
                         <Input 
                            placeholder="+ Add Milestone" 
                            className="h-8 text-xs bg-muted/20 border-border/40" 
                            onKeyDown={e => {
                               if (e.key === 'Enter') {
                                  handleAddMilestone(goal.id, e.currentTarget.value);
                                  e.currentTarget.value = '';
                               }
                            }}
                         />
                      </div>
                   </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-border/20 flex justify-between">
                 <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                   <CalendarIcon className="h-3 w-3" />
                   Target: {format(parseISO(goal.target_date), 'PPP')}
                 </div>
                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEditGoal(goal)}>
                      <ChevronRight className="h-4 w-4" /> 
                   </Button>
                   {!goal.is_pinned && (
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteGoal(goal.id)}>
                        <Trash2 className="h-4 w-4" />
                     </Button>
                   )}
                 </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
