import { collection, doc, setDoc, serverTimestamp, writeBatch, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";

export const seedDemoData = async () => {
  const batch = writeBatch(db);

  // 1. Create Demo Users
  const managerId = "demo-manager-id";
  const employee1Id = "demo-employee-1-id";
  const employee2Id = "demo-employee-2-id";

  const users = [
    {
      id: managerId,
      name: "Alex Sterling",
      email: "alex@goalquest.demo",
      role: "manager",
      department: "Product Engineering",
      managerId: "admin-id"
    },
    {
      id: employee1Id,
      name: "Jamie Chen",
      email: "jamie@goalquest.demo",
      role: "employee",
      department: "Product Engineering",
      managerId: managerId
    },
    {
      id: employee2Id,
      name: "Jordan Smith",
      email: "jordan@goalquest.demo",
      role: "employee",
      department: "Product Engineering",
      managerId: managerId
    }
  ];

  for (const user of users) {
    const userRef = doc(db, "users", user.id);
    batch.set(userRef, { ...user, createdAt: serverTimestamp() });
  }

  // 2. Global Config
  const configRef = doc(db, "config", "global");
  batch.set(configRef, {
    activeCycle: "FY2024-Q1",
    currentQuarter: "Q1",
    updatedAt: serverTimestamp()
  });

  // 3. Goal Sheets
  const sheet1Id = "demo-sheet-1";
  const sheet2Id = "demo-sheet-2";

  batch.set(doc(db, "goalSheets", sheet1Id), {
    employeeId: employee1Id,
    managerId: managerId,
    cycleId: "FY2024-Q1",
    status: "approved",
    isLocked: true,
    totalWeightage: 100,
    approvedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });

  batch.set(doc(db, "goalSheets", sheet2Id), {
    employeeId: employee2Id,
    managerId: managerId,
    cycleId: "FY2024-Q1",
    status: "pending",
    isLocked: false,
    totalWeightage: 100,
    submittedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });

  // 4. Goals for Employee 1 (Jamie) - Approved
  const goals1 = [
    {
      id: "goal-1-1",
      title: "Scale Infrastructure for Q1 Traffic",
      description: "Optimize cloud resource allocation to handle 40% increase in concurrent users while maintaining <200ms latency.",
      thrustArea: "Operational",
      uom: "percentage",
      target: "100",
      weightage: 40,
      sheetId: sheet1Id,
      employeeId: employee1Id,
      managerId: managerId
    },
    {
      id: "goal-1-2",
      title: "Launch Global Search 2.0",
      description: "Implement vector-based search across all tactical objective nodes with semantic relevance > 0.85.",
      thrustArea: "Strategic",
      uom: "numeric",
      target: "1",
      weightage: 30,
      sheetId: sheet1Id,
      employeeId: employee1Id,
      managerId: managerId
    },
    {
      id: "goal-1-3",
      title: "Mentor Junior Engineering Leads",
      description: "Conduct 12 structured coaching sessions on strategic architecture and system resilience.",
      thrustArea: "Growth",
      uom: "numeric",
      target: "12",
      weightage: 30,
      sheetId: sheet1Id,
      employeeId: employee1Id,
      managerId: managerId
    }
  ];

  for (const goal of goals1) {
    batch.set(doc(db, "goals", goal.id), { ...goal, createdAt: serverTimestamp() });
  }

  // 5. Goals for Employee 2 (Jordan) - Pending
  const goals2 = [
    {
      id: "goal-2-1",
      title: "Reduce Technical Debt in Auth Module",
      description: "Refactor legacy session management to use standardized JWT logic, reducing bug reports by 25%.",
      thrustArea: "Operational",
      uom: "percentage",
      target: "100",
      weightage: 50,
      sheetId: sheet2Id,
      employeeId: employee2Id,
      managerId: managerId
    },
    {
      id: "goal-2-2",
      title: "Open Source UI Framework",
      description: "Prepare and release internal component library to public repository with full documentation.",
      thrustArea: "Strategic",
      uom: "numeric",
      target: "1",
      weightage: 50,
      sheetId: sheet2Id,
      employeeId: employee2Id,
      managerId: managerId
    }
  ];

  for (const goal of goals2) {
    batch.set(doc(db, "goals", goal.id), { ...goal, createdAt: serverTimestamp() });
  }

  // 6. Checkins for Jamie
  const checkinsJamie = [
    {
      id: "checkin-1-1",
      goalId: "goal-1-1",
      employeeId: employee1Id,
      managerId: managerId,
      quarter: "Q1",
      actual: "85",
      status: "On Track",
      progressScore: 85,
      employeeComment: "AWS Graviton migration complete. Latency is looking good at 180ms.",
      managerFeedback: "Excellent progress on the migration. Keep an eye on the cost spikes during peak hours.",
      updatedAt: serverTimestamp()
    },
    {
       id: "checkin-1-2",
       goalId: "goal-1-2",
       employeeId: employee1Id,
       managerId: managerId,
       quarter: "Q1",
       actual: "0.5",
       status: "At Risk",
       progressScore: 50,
       employeeComment: "Model training is taking longer than expected due to dataset cleaning.",
       managerFeedback: "Let me know if you need more compute credits for the training phase.",
       updatedAt: serverTimestamp()
    }
  ];

  for (const checkin of checkinsJamie) {
    batch.set(doc(db, "checkins", checkin.id), { ...checkin, updatedAt: serverTimestamp() });
  }

  // 7. Audit Logs
  const logs = [
    { action: "APPROVE_SHEET", entityId: sheet1Id, timestamp: serverTimestamp(), userId: managerId },
    { action: "SUBMIT_SHEET", entityId: sheet2Id, timestamp: serverTimestamp(), userId: employee2Id },
    { action: "ADD_FEEDBACK", entityId: "checkin-1-1", timestamp: serverTimestamp(), userId: managerId }
  ];

  for (const log of logs) {
    const logRef = doc(collection(db, "auditLogs"));
    batch.set(logRef, log);
  }

  await batch.commit();
};
