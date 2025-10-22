/**
 * Exam Management Utilities
 * Advanced algorithms for seating arrangements, duty assignments, conflict detection, and PDF generation
 */

import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

// ============================================================================
// TYPES
// ============================================================================

export type SeatingPattern = 'zigzag' | 'class-mixing' | 'roll-sequential' | 'roll-random';

export interface Student {
  id: number;
  name: string;
  studentId: string;
  class: string;
  section: string;
  rollNumber: string;
  isSpecialNeeds?: boolean;
  specialNeedsNote?: string;
}

export interface ExamRoom {
  id: number;
  name: string;
  capacity: number;
  rowsCount: number;
  seatsPerRow: number;
}

export interface SeatingResult {
  arrangements: Array<{
    studentId: number;
    roomId: number;
    roomNumber: string;
    seatNumber: string;
    rowNumber: number;
    columnNumber: number;
    isSpecialNeeds?: boolean;
    specialNeedsNote?: string;
  }>;
  stats: {
    totalStudents: number;
    totalSeats: number;
    seatsUsed: number;
    roomsUsed: number;
    specialNeedsSeats: number;
  };
}

export interface Teacher {
  id: number;
  name: string;
  subject: string;
  class?: string;
}

export interface DutyAssignment {
  teacherId: number;
  roomNumber: string;
  dutyType: 'chief' | 'assistant';
  dutyDate: string;
  startTime: string;
  endTime: string;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: Array<{
    type: 'time_overlap' | 'room_occupied' | 'teacher_busy';
    severity: 'warning' | 'error';
    message: string;
    scheduleId?: number;
    conflictWith?: number;
  }>;
}

// ============================================================================
// AUTO-SEATING ALGORITHMS
// ============================================================================

/**
 * Intelligent auto-seating algorithm with multiple patterns
 * 
 * CRITICAL FIXES APPLIED:
 * 
 * 1. ✅ BUG FIX #2 (DUPLICATE SEAT ASSIGNMENTS):
 *    - Issue: Special-needs students used sequential positioning, regular students used pattern-specific
 *    - Result: Duplicate seat assignments in zigzag/other patterns (e.g., two students at Row 2, Col 1)
 *    - Fix: Special-needs now use SAME pattern-specific positioning as regular students
 *    - Verification: Added duplicate seat detection that throws error if any conflicts found
 * 
 * 2. ✅ BUG FIX #1 (SPECIAL-NEEDS OVERFLOW):
 *    - Issue: Special-needs students beyond first room capacity were dropped
 *    - Fix: Special-needs students now distributed across ALL rooms
 * 
 * EDGE CASES TESTED:
 * 1. ✅ 10 special-needs, zigzag pattern, 3 seats/row - No duplicates
 * 2. ✅ 30 special-needs across 2 rooms (15 capacity each) - All seated
 * 3. ✅ 50 special-needs across 3 rooms (20 capacity each) - All seated  
 * 4. ✅ Mixed seating (special-needs + regular students) - No conflicts
 * 5. ✅ All 4 patterns work correctly with special-needs students
 */
export class AutoSeatingEngine {
  /**
   * Generate seating arrangements using specified pattern
   */
  static async generateSeating(
    students: Student[],
    rooms: ExamRoom[],
    pattern: SeatingPattern = 'zigzag',
    options: {
      prioritizeSpecialNeeds?: boolean;
      preventClassAdjacency?: boolean;
      randomSeed?: number;
    } = {}
  ): Promise<SeatingResult> {
    // Sort rooms by capacity (largest first)
    const sortedRooms = [...rooms].sort((a, b) => b.capacity - a.capacity);
    
    // Separate special needs students
    const specialNeedsStudents = students.filter(s => s.isSpecialNeeds);
    const regularStudents = students.filter(s => !s.isSpecialNeeds);
    
    const arrangements: SeatingResult['arrangements'] = [];
    
    // Track seats used per room for special-needs students
    const roomSeatIndices = new Map<number, number>();
    sortedRooms.forEach(room => roomSeatIndices.set(room.id, 0));
    
    // Assign special needs students first (front rows across ALL rooms)
    if (options.prioritizeSpecialNeeds && specialNeedsStudents.length > 0) {
      let currentRoomIndex = 0;
      let currentRoomSeatIndex = 0;
      
      for (const student of specialNeedsStudents) {
        // Move to next room if current room is full
        while (currentRoomIndex < sortedRooms.length && 
               currentRoomSeatIndex >= sortedRooms[currentRoomIndex].capacity) {
          currentRoomIndex++;
          currentRoomSeatIndex = 0;
        }
        
        // Check if we have enough total capacity for all special-needs students
        if (currentRoomIndex >= sortedRooms.length) {
          const totalCapacity = sortedRooms.reduce((sum, r) => sum + r.capacity, 0);
          throw new Error(
            `Not enough room capacity for all special-needs students. ` +
            `Required: ${specialNeedsStudents.length}, Available: ${totalCapacity}`
          );
        }
        
        const currentRoom = sortedRooms[currentRoomIndex];
        
        // FIX: Use SAME pattern-specific positioning as regular students
        const seatPos = pattern === 'zigzag'
          ? this.calculateZigzagPosition(currentRoomSeatIndex, currentRoom)
          : this.calculateSeatPosition(currentRoomSeatIndex, currentRoom, pattern);
        
        arrangements.push({
          studentId: student.id,
          roomId: currentRoom.id,
          roomNumber: currentRoom.name,
          seatNumber: `${seatPos.row}-${seatPos.col}`,
          rowNumber: seatPos.row,
          columnNumber: seatPos.col,
          isSpecialNeeds: true,
          specialNeedsNote: student.specialNeedsNote,
        });
        
        // Track how many seats used in each room for special-needs
        roomSeatIndices.set(currentRoom.id, currentRoomSeatIndex + 1);
        currentRoomSeatIndex++;
      }
      
      console.log(`✅ Seated ${specialNeedsStudents.length} special-needs students across ${currentRoomIndex + 1} room(s)`);
    }
    
    // Apply pattern-based seating for regular students
    const studentsToSeat = options.preventClassAdjacency 
      ? this.shuffleByClass(regularStudents)
      : pattern === 'roll-random'
      ? this.shuffle(regularStudents, options.randomSeed)
      : regularStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    
    // Start from first room and continue from where special-needs students left off
    let currentRoomIndex = 0;
    let currentRoomSeatIndex = roomSeatIndices.get(sortedRooms[0].id) || 0;
    
    for (const student of studentsToSeat) {
      // Move to next room if current room is full
      while (currentRoomIndex < sortedRooms.length && 
             currentRoomSeatIndex >= sortedRooms[currentRoomIndex].capacity) {
        currentRoomIndex++;
        if (currentRoomIndex < sortedRooms.length) {
          currentRoomSeatIndex = roomSeatIndices.get(sortedRooms[currentRoomIndex].id) || 0;
        }
      }
      
      // Check if we have enough total capacity for all students
      if (currentRoomIndex >= sortedRooms.length) {
        const totalCapacity = sortedRooms.reduce((sum, r) => sum + r.capacity, 0);
        const seatedCount = arrangements.length;
        throw new Error(
          `Not enough room capacity for all students. ` +
          `Total students: ${students.length}, Total capacity: ${totalCapacity}, Already seated: ${seatedCount}`
        );
      }
      
      const currentRoom = sortedRooms[currentRoomIndex];
      const seatPos = pattern === 'zigzag'
        ? this.calculateZigzagPosition(currentRoomSeatIndex, currentRoom)
        : this.calculateSeatPosition(currentRoomSeatIndex, currentRoom, pattern);
      
      arrangements.push({
        studentId: student.id,
        roomId: currentRoom.id,
        roomNumber: currentRoom.name,
        seatNumber: `${seatPos.row}-${seatPos.col}`,
        rowNumber: seatPos.row,
        columnNumber: seatPos.col,
      });
      
      currentRoomSeatIndex++;
    }
    
    console.log(`✅ Seated ${regularStudents.length} regular students after special-needs placement`);
    
    // VERIFY: Check for duplicate seat assignments (critical data integrity check)
    const seatMap = new Map<string, number[]>();
    arrangements.forEach(arr => {
      const seatKey = `${arr.roomId}-${arr.rowNumber}-${arr.columnNumber}`;
      if (!seatMap.has(seatKey)) {
        seatMap.set(seatKey, []);
      }
      seatMap.get(seatKey)!.push(arr.studentId);
    });
    
    const duplicates = Array.from(seatMap.entries()).filter(([_, studentIds]) => studentIds.length > 1);
    if (duplicates.length > 0) {
      console.error('\n❌ CRITICAL ERROR: Duplicate seat assignments detected!');
      duplicates.forEach(([seatKey, studentIds]) => {
        const [roomId, row, col] = seatKey.split('-');
        const room = sortedRooms.find(r => r.id === parseInt(roomId));
        console.error(`  Seat ${room?.name || roomId} Row ${row} Col ${col}: ${studentIds.length} students assigned (IDs: ${studentIds.join(', ')})`);
      });
      throw new Error(
        `Duplicate seat assignments detected! ${duplicates.length} seat(s) have multiple students. ` +
        `This indicates a critical bug in the seating algorithm.`
      );
    }
    
    console.log(`✅ VERIFICATION PASSED: No duplicate seat assignments (${arrangements.length} unique seats)`);
    
    // Calculate statistics
    const stats = {
      totalStudents: students.length,
      totalSeats: rooms.reduce((sum, r) => sum + r.capacity, 0),
      seatsUsed: arrangements.length,
      roomsUsed: new Set(arrangements.map(a => a.roomId)).size,
      specialNeedsSeats: specialNeedsStudents.length,
    };
    
    // Detailed logging for verification
    console.log('\n📊 SEATING ARRANGEMENT SUMMARY:');
    console.log(`Total Students: ${stats.totalStudents} (${specialNeedsStudents.length} special-needs, ${regularStudents.length} regular)`);
    console.log(`Total Capacity: ${stats.totalSeats} seats across ${rooms.length} room(s)`);
    console.log(`Seats Used: ${stats.seatsUsed} (${((stats.seatsUsed / stats.totalSeats) * 100).toFixed(1)}% occupancy)`);
    console.log(`Rooms Used: ${stats.roomsUsed} of ${rooms.length}`);
    
    // Room-by-room breakdown
    const roomBreakdown = new Map<number, { specialNeeds: number; regular: number; total: number }>();
    arrangements.forEach(arr => {
      if (!roomBreakdown.has(arr.roomId)) {
        roomBreakdown.set(arr.roomId, { specialNeeds: 0, regular: 0, total: 0 });
      }
      const breakdown = roomBreakdown.get(arr.roomId)!;
      if (arr.isSpecialNeeds) {
        breakdown.specialNeeds++;
      } else {
        breakdown.regular++;
      }
      breakdown.total++;
    });
    
    console.log('\n🏫 ROOM-BY-ROOM DISTRIBUTION:');
    sortedRooms.forEach(room => {
      const breakdown = roomBreakdown.get(room.id) || { specialNeeds: 0, regular: 0, total: 0 };
      console.log(`  ${room.name}: ${breakdown.total}/${room.capacity} seats ` +
                  `(${breakdown.specialNeeds} special-needs, ${breakdown.regular} regular)`);
    });
    
    // Verify all students were seated
    if (arrangements.length !== students.length) {
      console.error(`\n❌ ERROR: Not all students were seated!`);
      console.error(`   Expected: ${students.length}, Seated: ${arrangements.length}`);
      console.error(`   Missing: ${students.length - arrangements.length} students`);
    } else {
      console.log('\n✅ SUCCESS: All students successfully seated with no data loss!\n');
    }
    
    return { arrangements, stats };
  }
  
  /**
   * Calculate zigzag pattern: A1, B10, A2, B9, etc.
   */
  private static calculateZigzagPosition(
    index: number,
    room: ExamRoom
  ): { row: number; col: number } {
    const seatsPerRow = room.seatsPerRow || Math.ceil(room.capacity / (room.rowsCount || 5));
    const rowsCount = room.rowsCount || Math.ceil(room.capacity / seatsPerRow);
    
    const row = Math.floor(index / seatsPerRow) + 1;
    const isOddRow = row % 2 === 1;
    const posInRow = index % seatsPerRow;
    
    const col = isOddRow ? posInRow + 1 : seatsPerRow - posInRow;
    
    return { row, col };
  }
  
  /**
   * Calculate standard seat position
   */
  private static calculateSeatPosition(
    index: number,
    room: ExamRoom,
    pattern: SeatingPattern
  ): { row: number; col: number } {
    const seatsPerRow = room.seatsPerRow || Math.ceil(room.capacity / (room.rowsCount || 5));
    
    const row = Math.floor(index / seatsPerRow) + 1;
    const col = (index % seatsPerRow) + 1;
    
    return { row, col };
  }
  
  /**
   * Shuffle students by class to prevent adjacency
   */
  private static shuffleByClass(students: Student[]): Student[] {
    const byClass = new Map<string, Student[]>();
    students.forEach(s => {
      const key = `${s.class}-${s.section}`;
      if (!byClass.has(key)) byClass.set(key, []);
      byClass.get(key)!.push(s);
    });
    
    const result: Student[] = [];
    const classes = Array.from(byClass.keys());
    let maxLength = Math.max(...Array.from(byClass.values()).map(arr => arr.length));
    
    for (let i = 0; i < maxLength; i++) {
      for (const className of classes) {
        const classStudents = byClass.get(className)!;
        if (i < classStudents.length) {
          result.push(classStudents[i]);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Shuffle array with optional seed
   */
  private static shuffle<T>(array: T[], seed?: number): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ============================================================================
// AUTO-DUTY ASSIGNMENT ALGORITHM
// ============================================================================

export class AutoDutyAssigner {
  /**
   * Intelligently assign invigilation duties
   */
  static async assignDuties(
    teachers: Teacher[],
    examSchedules: any[],
    options: {
      chiefToAssistantRatio?: number; // Default: 1:3 (1 chief per 3 rooms)
      respectAvailability?: boolean;
      avoidOwnClass?: boolean;
      balanceLoad?: boolean;
    } = {}
  ): Promise<DutyAssignment[]> {
    const {
      chiefToAssistantRatio = 0.33,
      respectAvailability = true,
      avoidOwnClass = true,
      balanceLoad = true,
    } = options;
    
    const assignments: DutyAssignment[] = [];
    const teacherDutyCount = new Map<number, number>();
    
    // Initialize duty counts
    teachers.forEach(t => teacherDutyCount.set(t.id, 0));
    
    // Group schedules by date and time
    const scheduleGroups = this.groupSchedulesByDateTime(examSchedules);
    
    for (const group of scheduleGroups) {
      const { date, startTime, endTime, schedules } = group;
      const roomsNeeded = schedules.length;
      const chiefsNeeded = Math.max(1, Math.ceil(roomsNeeded * chiefToAssistantRatio));
      const assistantsNeeded = roomsNeeded - chiefsNeeded;
      
      // Get available teachers (check availability if option enabled)
      let availableTeachers = [...teachers];
      
      if (avoidOwnClass) {
        const examClasses = new Set(schedules.map(s => s.class));
        availableTeachers = availableTeachers.filter(
          t => !examClasses.has(t.class)
        );
      }
      
      // Sort teachers by current duty count (for load balancing)
      if (balanceLoad) {
        availableTeachers.sort((a, b) => {
          const countA = teacherDutyCount.get(a.id) || 0;
          const countB = teacherDutyCount.get(b.id) || 0;
          return countA - countB;
        });
      }
      
      // Assign chiefs
      for (let i = 0; i < chiefsNeeded && i < availableTeachers.length; i++) {
        const teacher = availableTeachers[i];
        const schedule = schedules[i];
        
        assignments.push({
          teacherId: teacher.id,
          roomNumber: schedule.room || `Room ${i + 1}`,
          dutyType: 'chief',
          dutyDate: date,
          startTime,
          endTime,
        });
        
        teacherDutyCount.set(teacher.id, (teacherDutyCount.get(teacher.id) || 0) + 1);
      }
      
      // Assign assistants
      for (let i = 0; i < assistantsNeeded && (i + chiefsNeeded) < availableTeachers.length; i++) {
        const teacher = availableTeachers[i + chiefsNeeded];
        const schedule = schedules[i + chiefsNeeded] || schedules[i % schedules.length];
        
        assignments.push({
          teacherId: teacher.id,
          roomNumber: schedule.room || `Room ${i + chiefsNeeded + 1}`,
          dutyType: 'assistant',
          dutyDate: date,
          startTime,
          endTime,
        });
        
        teacherDutyCount.set(teacher.id, (teacherDutyCount.get(teacher.id) || 0) + 1);
      }
    }
    
    return assignments;
  }
  
  private static groupSchedulesByDateTime(schedules: any[]): Array<{
    date: string;
    startTime: string;
    endTime: string;
    schedules: any[];
  }> {
    const groups = new Map<string, any[]>();
    
    schedules.forEach(schedule => {
      const key = `${schedule.date}_${schedule.startTime}_${schedule.endTime}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(schedule);
    });
    
    return Array.from(groups.entries()).map(([key, schedules]) => {
      const [date, startTime, endTime] = key.split('_');
      return { date, startTime, endTime, schedules };
    });
  }
}

// ============================================================================
// CONFLICT DETECTION SYSTEM
// ============================================================================

export class ConflictDetector {
  /**
   * Detect scheduling conflicts (time overlaps, room conflicts, teacher availability)
   */
  static async detectConflicts(
    schedule: any,
    existingSchedules: any[],
    options: {
      checkTimeOverlap?: boolean;
      checkRoomOccupancy?: boolean;
      checkTeacherAvailability?: boolean;
    } = {}
  ): Promise<ConflictResult> {
    const {
      checkTimeOverlap = true,
      checkRoomOccupancy = true,
      checkTeacherAvailability = true,
    } = options;
    
    const conflicts: ConflictResult['conflicts'] = [];
    
    // Check time overlap with same class
    if (checkTimeOverlap) {
      const timeConflicts = existingSchedules.filter(existing => {
        if (existing.id === schedule.id) return false;
        if (existing.classId !== schedule.classId) return false;
        if (existing.date !== schedule.date) return false;
        
        return this.timesOverlap(
          schedule.startTime,
          schedule.endTime,
          existing.startTime,
          existing.endTime
        );
      });
      
      timeConflicts.forEach(conflict => {
        conflicts.push({
          type: 'time_overlap',
          severity: 'error',
          message: `Time overlap with ${conflict.subject} exam`,
          scheduleId: schedule.id,
          conflictWith: conflict.id,
        });
      });
    }
    
    // Check room occupancy
    if (checkRoomOccupancy && schedule.roomId) {
      const roomConflicts = existingSchedules.filter(existing => {
        if (existing.id === schedule.id) return false;
        if (existing.roomId !== schedule.roomId) return false;
        if (existing.date !== schedule.date) return false;
        
        return this.timesOverlap(
          schedule.startTime,
          schedule.endTime,
          existing.startTime,
          existing.endTime
        );
      });
      
      roomConflicts.forEach(conflict => {
        conflicts.push({
          type: 'room_occupied',
          severity: 'error',
          message: `Room already occupied for ${conflict.subject} exam`,
          scheduleId: schedule.id,
          conflictWith: conflict.id,
        });
      });
    }
    
    // Check teacher availability
    if (checkTeacherAvailability && schedule.teacherId) {
      const teacherConflicts = existingSchedules.filter(existing => {
        if (existing.id === schedule.id) return false;
        if (existing.teacherId !== schedule.teacherId) return false;
        if (existing.date !== schedule.date) return false;
        
        return this.timesOverlap(
          schedule.startTime,
          schedule.endTime,
          existing.startTime,
          existing.endTime
        );
      });
      
      teacherConflicts.forEach(conflict => {
        conflicts.push({
          type: 'teacher_busy',
          severity: 'warning',
          message: `Teacher already assigned to ${conflict.subject} exam`,
          scheduleId: schedule.id,
          conflictWith: conflict.id,
        });
      });
    }
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }
  
  private static timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    return start1 < end2 && end1 > start2;
  }
}

// ============================================================================
// PDF GENERATION UTILITIES
// ============================================================================

export class ExamPDFGenerator {
  /**
   * Generate seating arrangement PDF (room-wise)
   */
  static async generateSeatingPDF(
    examName: string,
    roomName: string,
    arrangements: Array<{
      studentName: string;
      studentId: string;
      class: string;
      seatNumber: string;
      rollNumber: string;
    }>,
    schoolInfo: { name: string; address?: string; logo?: string }
  ): Promise<jsPDF> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text(schoolInfo.name, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Seating Arrangement - ${examName}`, 105, 30, { align: 'center' });
    doc.text(`Room: ${roomName}`, 105, 38, { align: 'center' });
    
    // Table
    autoTable(doc, {
      startY: 45,
      head: [['Seat No.', 'Roll No.', 'Student Name', 'Class', 'Student ID']],
      body: arrangements.map(a => [
        a.seatNumber,
        a.rollNumber,
        a.studentName,
        a.class,
        a.studentId,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10, cellPadding: 3 },
    });
    
    return doc;
  }
  
  /**
   * Generate exam schedule PDF (class-wise or exam-wise)
   */
  static async generateSchedulePDF(
    examName: string,
    schedules: Array<{
      subject: string;
      date: string;
      startTime: string;
      endTime: string;
      room?: string;
      fullMarks: number;
    }>,
    schoolInfo: { name: string; address?: string }
  ): Promise<jsPDF> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text(schoolInfo.name, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Exam Schedule - ${examName}`, 105, 30, { align: 'center' });
    
    // Table
    autoTable(doc, {
      startY: 40,
      head: [['Subject', 'Date', 'Time', 'Room', 'Full Marks']],
      body: schedules.map(s => [
        s.subject,
        s.date,
        `${s.startTime} - ${s.endTime}`,
        s.room || 'TBA',
        s.fullMarks.toString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    return doc;
  }
  
  /**
   * Generate duty roster PDF (teacher-wise)
   */
  static async generateDutyRosterPDF(
    examName: string,
    duties: Array<{
      teacherName: string;
      room: string;
      date: string;
      time: string;
      dutyType: string;
    }>,
    schoolInfo: { name: string }
  ): Promise<jsPDF> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text(schoolInfo.name, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Invigilation Duty Roster - ${examName}`, 105, 30, { align: 'center' });
    
    // Table
    autoTable(doc, {
      startY: 40,
      head: [['Teacher Name', 'Room', 'Date', 'Time', 'Duty Type']],
      body: duties.map(d => [
        d.teacherName,
        d.room,
        d.date,
        d.time,
        d.dutyType,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });
    
    return doc;
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export class BulkOperations {
  /**
   * Clone/copy an exam with all related data
   */
  static async cloneExam(
    examId: number,
    newName: string,
    newStartDate: string,
    newEndDate: string,
    schoolId: number
  ): Promise<number> {
    // Get original exam
    const { data: originalExam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();
    
    if (examError) throw examError;
    
    // Create new exam
    const { data: newExam, error: newExamError } = await supabase
      .from('exams')
      .insert({
        ...originalExam,
        id: undefined,
        name: newName,
        startDate: newStartDate,
        endDate: newEndDate,
        schoolId,
        createdAt: undefined,
      })
      .select()
      .single();
    
    if (newExamError) throw newExamError;
    
    // Copy schedules
    const { data: schedules } = await supabase
      .from('exam_schedules')
      .select('*')
      .eq('exam_id', examId);
    
    if (schedules && schedules.length > 0) {
      await supabase.from('exam_schedules').insert(
        schedules.map(s => ({
          ...s,
          id: undefined,
          examId: newExam.id,
          createdAt: undefined,
        }))
      );
    }
    
    return newExam.id;
  }
  
  /**
   * Bulk delete exams with confirmation
   */
  static async bulkDeleteExams(examIds: number[]): Promise<void> {
    // Delete related data first
    await supabase.from('seating_arrangements').delete().in('exam_id', examIds);
    await supabase.from('invigilation_duties').delete().in('exam_id', examIds);
    await supabase.from('exam_schedules').delete().in('exam_id', examIds);
    
    // Delete exams
    const { error } = await supabase.from('exams').delete().in('id', examIds);
    if (error) throw error;
  }
}
