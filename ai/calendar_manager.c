/* ============================================================
   Calendar of Events Manager
   ------------------------------------------------------------
   Data Structures Used
     1. Doubly Linked List (dllADT.h)   -> stores active events,
                                            kept sorted by date/time
     2. Stack (stackADT.h)              -> stores deleted events
   Both ADTs use a dummy "header" node, matching the style of the
   supplied dllADT.h sample.
   ============================================================ */

#include <stdio.h>
#include "dllADT.h"
#include "stackADT.h"

struct node *calendar;      /* header of the sorted calendar list */
struct snode *deletedStack; /* header of the deleted-events stack */
int eventCount = 0;         /* running count of events            */

/* ============================================================
   1. ADD EVENT   -   just calls insertSorted() from dllADT.h
   ============================================================ */
void addEvent(struct Event e) {
    if (insertSorted(calendar, e) == 0) {
        printf("Error: Event ID %s already exists.\n", e.eventID);
        return;
    }
    eventCount = eventCount + 1;
    printf("Event %s (%s) added.\n", e.eventID, e.eventName);
}

/* ============================================================
   2. DELETE EVENT   -   deleteByID() removes it from the list,
   push() saves a copy on the deleted-events stack.
   ============================================================ */
void deleteEvent(char id[]) {
    struct Event e;
    if (deleteByID(calendar, id, &e) == 0) {
        printf("Error: Event ID %s not found.\n", id);
        return;
    }
    push(deletedStack, e);
    eventCount = eventCount - 1;
    printf("Event %s (%s) deleted.\n", id, e.eventName);
}

/* ============================================================
   3. RESTORE LAST DELETED EVENT
   pop() takes the most recent deletion off the stack;
   insertSorted() puts it back in its correct chronological spot.
   ============================================================ */
void restoreLastDeleted(void) {
    struct Event e;
    if (pop(deletedStack, &e) == 0) {
        printf("No deleted event to restore.\n");
        return;
    }
    insertSorted(calendar, e);
    eventCount = eventCount + 1;
    printf("Event %s (%s) restored.\n", e.eventID, e.eventName);
}

/* ============================================================
   4. DISPLAY CALENDAR   -   displayList() from dllADT.h
   ============================================================ */
void displayCalendar(void) {
    displayList(calendar);
}

/* ============================================================
   5. SEARCH EVENT   -   searchByID() from dllADT.h
   ============================================================ */
void searchEvent(char id[]) {
    struct Event e;
    if (searchByID(calendar, id, &e) == 0) {
        printf("Event ID %s not found.\n", id);
        return;
    }
    printf("Found -> ID:%s  Name:%s  Date:%02d-%02d-%04d  Time:%02d:%02d\n",
           e.eventID, e.eventName, e.day, e.month, e.year, e.hour, e.minute);
}

/* ============================================================
   6. DISPLAY RECENTLY DELETED EVENT   -   peek() from stackADT.h
   ============================================================ */
void displayRecentlyDeleted(void) {
    struct Event e;
    if (peek(deletedStack, &e) == 0) {
        printf("No deleted events.\n");
        return;
    }
    printf("Recently Deleted -> ID:%s  Name:%s  Date:%02d-%02d-%04d  Time:%02d:%02d\n",
           e.eventID, e.eventName, e.day, e.month, e.year, e.hour, e.minute);
}

/* ============================================================
   7. COUNT EVENTS   -   O(1) via the running counter
   ============================================================ */
void countEvents(void) {
    printf("Total events in calendar: %d\n", eventCount);
}

/* ============================================================
   Menu-driven driver
   ============================================================ */
int main(void) {
    calendar = createHeader();
    deletedStack = createStackHeader();

    int choice;
    struct Event e;
    char id[ID_LEN];

    while (1) {
        printf("\n--- Calendar of Events Manager ---\n");
        printf("1. Add Event\n2. Delete Event\n3. Restore Last Deleted Event\n");
        printf("4. Display Calendar\n5. Search Event\n6. Display Recently Deleted Event\n");
        printf("7. Count Events\n0. Exit\nEnter choice: ");

        if (scanf("%d", &choice) != 1) break;

        if (choice == 1) {
            printf("Event ID: ");   scanf("%s", e.eventID);
            printf("Event Name: "); scanf("%s", e.eventName);
            printf("Day: ");   scanf("%d", &e.day);
            printf("Month: "); scanf("%d", &e.month);
            printf("Year: ");  scanf("%d", &e.year);
            printf("Hour (0-23): ");   scanf("%d", &e.hour);
            printf("Minute (0-59): "); scanf("%d", &e.minute);
            addEvent(e);
        }
        else if (choice == 2) {
            printf("Event ID to delete: "); scanf("%s", id);
            deleteEvent(id);
        }
        else if (choice == 3) {
            restoreLastDeleted();
        }
        else if (choice == 4) {
            displayCalendar();
        }
        else if (choice == 5) {
            printf("Event ID to search: "); scanf("%s", id);
            searchEvent(id);
        }
        else if (choice == 6) {
            displayRecentlyDeleted();
        }
        else if (choice == 7) {
            countEvents();
        }
        else if (choice == 0) {
            return 0;
        }
        else {
            printf("Invalid choice.\n");
        }
    }
    return 0;
}
