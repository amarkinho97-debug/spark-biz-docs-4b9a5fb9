import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface City {
  code: string; // Código IBGE com 7 dígitos
  name: string;
  uf: string;
}

interface CitySearchInputProps {
  value: string;
  onChange: (code: string) => void;
}

export function CitySearchInput({ value, onChange }: CitySearchInputProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchCities() {
      setLoading(true);
      try {
        const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios");
        const data = await response.json();
        const mapped: City[] = data.map((item: any) => ({
          code: String(item.id).padStart(7, "0"),
          name: item.nome,
          uf: item.microrregiao?.mesorregiao?.UF?.sigla ?? "",
        }));
        setCities(mapped);
      } catch (error) {
        console.error("Erro ao carregar municípios do IBGE", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCities();
  }, []);

  const selectedCity = useMemo(
    () => cities.find((city) => city.code === value),
    [cities, value],
  );

  const filteredCities = useMemo(() => {
    if (!search) return cities.slice(0, 50);
    const normalized = search.toLowerCase();
    return cities
      .filter((city) =>
        `${city.name} ${city.uf} ${city.code}`.toLowerCase().includes(normalized),
      )
      .slice(0, 50);
  }, [cities, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
          disabled={loading}
        >
          {loading
            ? "Carregando cidades..."
            : selectedCity
              ? `${selectedCity.name} - ${selectedCity.uf} (IBGE: ${selectedCity.code})`
              : value
                ? `IBGE: ${value}`
                : "Buscar cidade (IBGE)"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px] sm:w-[400px] bg-popover">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando municípios...
          </div>
        ) : (
          <Command>
            <CommandInput
              placeholder="Digite o nome da cidade ou código IBGE"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredCities.map((city) => (
                  <CommandItem
                    key={city.code}
                    value={`${city.name} ${city.uf} ${city.code}`}
                    onSelect={() => {
                      onChange(city.code);
                      setOpen(false);
                    }}
                    className="text-foreground"
                  >
                    <span className="flex flex-col text-sm">
                      <span className="font-medium">
                        {city.name} - {city.uf}
                      </span>
                      <span className="text-[11px] text-muted-foreground">IBGE: {city.code}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
