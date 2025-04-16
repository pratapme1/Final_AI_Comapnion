import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Switch, Route, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import ReceiptsList from "@/components/receipts/ReceiptsList";
import ReceiptUpload from "@/components/receipts/ReceiptUpload";
import ReceiptDetail from "@/components/receipts/ReceiptDetail";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const Receipts = () => {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  return (
    <div>
      <Switch>
        <Route path="/receipts" exact>
          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Receipts & Transactions</h1>
              <p className="text-sm text-gray-500 mt-1">
                View and manage your purchase history with AI insights
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link to="/receipts/upload">
                <Button className="inline-flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Receipt
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters & Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-1">
                  <Input
                    placeholder="Search by merchant or item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                      <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipts List */}
          <ReceiptsList 
            searchTerm={searchTerm}
            sortBy={sortBy}
            categoryFilter={categoryFilter}
          />
        </Route>

        <Route path="/receipts/upload" exact>
          <div className="mb-6">
            <Link href="/receipts">
              <Button variant="outline" className="mb-4">
                ← Back to Receipts
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Upload Receipt</h1>
          </div>
          <ReceiptUpload />
        </Route>

        <Route path="/receipts/:id">
          {(params) => (
            <>
              <div className="mb-6">
                <Link href="/receipts">
                  <Button variant="outline" className="mb-4">
                    ← Back to Receipts
                  </Button>
                </Link>
                <h1 className="text-2xl font-semibold text-gray-900">Receipt Details</h1>
              </div>
              <ReceiptDetail id={parseInt(params.id)} />
            </>
          )}
        </Route>
      </Switch>
    </div>
  );
};

export default Receipts;
