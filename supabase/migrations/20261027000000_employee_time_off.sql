-- Tabla para vacaciones y periodos de ausencia de empleadas
CREATE TABLE IF NOT EXISTS employee_time_off (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salon_id    uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'vacation'
                CHECK (type IN ('vacation','sick','rest','other')),
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- RLS
ALTER TABLE employee_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own time off"
  ON employee_time_off
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índice para consultas por empleada y rango de fechas
CREATE INDEX idx_time_off_employee ON employee_time_off (employee_id, start_date, end_date);
CREATE INDEX idx_time_off_salon    ON employee_time_off (salon_id, start_date, end_date);
