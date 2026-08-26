export function enrollmentKey(studentId: number, courseDocumentId: string) {
  return `student:${studentId}:course:${courseDocumentId}`;
}

export function lessonProgressKey(studentId: number, lessonDocumentId: string) {
  return `student:${studentId}:lesson:${lessonDocumentId}`;
}
